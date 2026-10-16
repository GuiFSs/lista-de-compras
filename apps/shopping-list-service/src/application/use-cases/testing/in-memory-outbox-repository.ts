import { randomUUID } from 'node:crypto';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import {
  type OutboxMessage,
  OutboxRepository,
} from '../../ports/outbox-repository.port';
import type { InMemoryShoppingListRepository } from './in-memory-shopping-list-repository';

/**
 * Outbox em memória para os testes de caso de uso e do publisher. Modela o
 * mesmo contrato do adaptador Drizzle: `deletePurchasedAndEnqueue` aplica o
 * `DELETE` na lista e o `INSERT` da mensagem como uma operação única — com
 * `failNextWrite` nenhum dos dois efeitos fica (rollback).
 *
 * `findPending` devolve em ordem de inserção (FIFO); a ordenação real por
 * `(created_at, id)` é responsabilidade do adaptador e é coberta pelo spec dele.
 */
export class InMemoryOutboxRepository extends OutboxRepository {
  private readonly messages: OutboxMessage[] = [];
  private nextWriteFailure: Error | null = null;

  constructor(private readonly listItems: InMemoryShoppingListRepository) {
    super();
  }

  /** Próxima gravação atômica falha uma vez — simula erro no meio da transação. */
  failNextWrite(error: Error): void {
    this.nextWriteFailure = error;
  }

  async deletePurchasedAndEnqueue(
    purchasedIds: readonly string[],
    envelope: PurchaseCompletedEventV1,
  ): Promise<void> {
    if (this.nextWriteFailure !== null) {
      const failure = this.nextWriteFailure;
      this.nextWriteFailure = null;
      throw failure;
    }
    await this.listItems.deleteByIds(purchasedIds);
    this.messages.push({
      id: randomUUID(),
      completionId: envelope.payload.completionId,
      eventType: envelope.eventType,
      eventVersion: envelope.eventVersion,
      envelope,
      createdAt: new Date(),
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });
  }

  async findPending(limit?: number): Promise<OutboxMessage[]> {
    const pending = this.messages.filter(
      (message) => message.publishedAt === null,
    );
    return limit === undefined ? pending : pending.slice(0, limit);
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    this.replace(id, { publishedAt, lastError: null });
  }

  async recordFailure(id: string, lastError: string): Promise<void> {
    const message = this.byId(id);
    this.replace(id, {
      attempts: message.attempts + 1,
      lastError,
    });
  }

  /** Estado completo (publicadas inclusive) para asserções do teste. */
  all(): readonly OutboxMessage[] {
    return this.messages;
  }

  private byId(id: string): OutboxMessage {
    const found = this.messages.find((message) => message.id === id);
    if (found === undefined) {
      throw new Error(`Mensagem de outbox ${id} ausente no repositório em memória`);
    }
    return found;
  }

  private replace(id: string, changes: Partial<OutboxMessage>): void {
    const index = this.messages.findIndex((message) => message.id === id);
    if (index === -1) {
      throw new Error(`Mensagem de outbox ${id} ausente no repositório em memória`);
    }
    this.messages[index] = { ...this.messages[index], ...changes };
  }
}
