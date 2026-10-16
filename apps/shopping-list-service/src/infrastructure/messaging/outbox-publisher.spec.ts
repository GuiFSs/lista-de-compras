import { describe, expect, it } from 'vitest';
import { PURCHASE_COMPLETED_ROUTING_KEY, type PurchaseCompletedEventV1 } from '@lista/contracts';
import type { EventPublisher } from '../../application/ports/event-publisher.port';
import type { OutboxMessage } from '../../ports/outbox-repository.port';
import { OutboxPublisher } from './outbox-publisher';
import { InMemoryOutboxRepository } from '../../application/use-cases/testing/in-memory-outbox-repository';
import { InMemoryShoppingListRepository } from '../../application/use-cases/testing/in-memory-shopping-list-repository';

class FakeEventPublisher implements EventPublisher {
  public messages: PurchaseCompletedEventV1[] = [];
  private nextFailure: Error | null = null;

  failNext(error: Error): void {
    this.nextFailure = error;
  }

  async publish(event: PurchaseCompletedEventV1): Promise<void> {
    if (this.nextFailure !== null) {
      const failure = this.nextFailure;
      this.nextFailure = null;
      throw failure;
    }
    this.messages.push(event);
  }
}

function envelope(completionId: string): PurchaseCompletedEventV1 {
  return {
    eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    eventType: 'shopping-list.purchase-completed',
    eventVersion: 1,
    occurredAt: '2026-01-01T12:00:00.000Z',
    payload: {
      completionId,
      market: 'Mercado',
      purchaseDate: '2026-01-01',
      items: [{ name: 'Café', quantity: 2, unit: 'kg', unitPrice: 9.9 }],
    },
  };
}

describe('OutboxPublisher (ciclo de publicação)', () => {
  it('publica pendentes mais antigas e marca published_at (CD-06)', async () => {
    const list = new InMemoryShoppingListRepository([]);
    const outbox = new InMemoryOutboxRepository(list);
    const publisher = new FakeEventPublisher();
    const sut = new OutboxPublisher(outbox, publisher, { batchSize: 10 });

    await outbox.deletePurchasedAndEnqueue([], envelope('c1'));
    await outbox.deletePurchasedAndEnqueue([], envelope('c2'));
    const now = new Date('2026-01-02T00:00:00.000Z');
    const report = await sut.runOnce(now);

    expect(report.published).toBe(2);
    expect(report.failed).toHaveLength(0);
    expect(publisher.messages).toHaveLength(2);
    expect(publisher.messages[0].payload.completionId).toBe('c1');
    expect(publisher.messages[1].payload.completionId).toBe('c2');
    const all = outbox.all() as OutboxMessage[];
    expect(all.filter((m) => m.publishedAt !== null)).toHaveLength(2);
  });

  it('em falha grava attempts e last_error e re-tenta depois (retry)', async () => {
    const list = new InMemoryShoppingListRepository([]);
    const outbox = new InMemoryOutboxRepository(list);
    const publisher = new FakeEventPublisher();
    const sut = new OutboxPublisher(outbox, publisher, { batchSize: 5 });

    await outbox.deletePurchasedAndEnqueue([], envelope('c1'));
    publisher.failNext(new Error('broker indisponível'));
    const report1 = await sut.runOnce();

    expect(report1.published).toBe(0);
    expect(report1.failed).toHaveLength(1);
    const [m1] = outbox.all();
    expect(m1.publishedAt).toBeNull();
    expect(m1.attempts).toBe(1);
    expect(m1.lastError).toBe('broker indisponível');

    const report2 = await sut.runOnce(new Date('2026-01-03T00:00:00.000Z'));
    expect(report2.published).toBe(1);
    expect(publisher.messages).toHaveLength(1);
    const [m2] = outbox.all();
    expect(m2.publishedAt).not.toBeNull();
    expect(m2.lastError).toBeNull();
  });

  it('não bloqueia o lote em falha de um item (best-effort)', async () => {
    const list = new InMemoryShoppingListRepository([]);
    const outbox = new InMemoryOutboxRepository(list);
    const publisher = new FakeEventPublisher();
    const sut = new OutboxPublisher(outbox, publisher, { batchSize: 5 });

    await outbox.deletePurchasedAndEnqueue([], envelope('c1'));
    await outbox.deletePurchasedAndEnqueue([], envelope('c2'));
    publisher.failNext(new Error('falha 1'));
    const report = await sut.runOnce();

    expect(report.published).toBe(1);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0].id).toBeDefined();
    expect(publisher.messages[0].payload.completionId).toBe('c2'); // c1 falhou, c2 publicou
  });

  it('publica com a routing key correta (domain.events/topic)', async () => {
    // Verificação da topologia usada pelo adapter — a chave de roteamento está
    // definida no contrato e é usada pelo RabbitmqEventPublisher; este teste
    // garante que o contrato não mudou para esta feature.
    expect(PURCHASE_COMPLETED_ROUTING_KEY).toBe('shopping-list.purchase-completed.v1');
  });
});
