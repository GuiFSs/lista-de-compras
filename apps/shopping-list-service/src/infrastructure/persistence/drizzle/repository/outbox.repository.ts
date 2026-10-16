// Adaptador do port OutboxRepository — Drizzle no banco `shopping_list`
// (dono exclusivo deste serviço, ADR 0001). Só o caso de uso (via port) e o
// publisher da T-12 falam com ele.
import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import {
  type OutboxMessage,
  OutboxRepository,
} from '../../../../application/ports/outbox-repository.port';
import type { ShoppingListDb } from '../client';
import { DRIZZLE } from '../drizzle.provider';
import {
  type OutboxMessageRow,
  outboxMessages,
  shoppingListItems,
} from '../schema';

@Injectable()
export class DrizzleOutboxRepository implements OutboxRepository {
  constructor(@Inject(DRIZZLE) private readonly db: ShoppingListDb) {}

  async deletePurchasedAndEnqueue(
    purchasedIds: readonly string[],
    envelope: PurchaseCompletedEventV1,
  ): Promise<void> {
    // Atômico por decisão de CD-06: gravar o outbox sem o DELETE (ou vice-versa)
    // reabre o dual-write que o padrão existe para eliminar.
    await this.db.transaction(async (tx) => {
      if (purchasedIds.length > 0) {
        await tx
          .delete(shoppingListItems)
          .where(inArray(shoppingListItems.id, [...purchasedIds]));
      }
      await tx.insert(outboxMessages).values({
        completionId: envelope.payload.completionId,
        eventType: envelope.eventType,
        eventVersion: envelope.eventVersion,
        payload: envelope,
      });
    });
  }

  async findPending(limit?: number): Promise<OutboxMessage[]> {
    const query = this.db
      .select()
      .from(outboxMessages)
      .where(isNull(outboxMessages.publishedAt))
      .orderBy(asc(outboxMessages.createdAt), asc(outboxMessages.id));
    const rows = limit === undefined ? await query : await query.limit(limit);
    return rows.map(toOutboxMessage);
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    await this.db
      .update(outboxMessages)
      .set({ publishedAt, lastError: null })
      .where(eq(outboxMessages.id, id));
  }

  async recordFailure(id: string, lastError: string): Promise<void> {
    await this.db
      .update(outboxMessages)
      .set({ attempts: sql`${outboxMessages.attempts} + 1`, lastError })
      .where(eq(outboxMessages.id, id));
  }
}

function toOutboxMessage(row: OutboxMessageRow): OutboxMessage {
  return {
    id: row.id,
    completionId: row.completionId,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    envelope: row.payload,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
    attempts: row.attempts,
    lastError: row.lastError,
  };
}
