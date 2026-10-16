// Integração do adaptador Drizzle do outbox com o Postgres real (T-11).
//
// Pré-requisitos (PLAN): `npm run docker:up` e
// `npx nx run shopping-list-service:db:migrate`.
//
// Os casos só limpam as linhas que eles mesmos criam (ids rastreados) e, na
// lista, afirmam sempre AUSÊNCIA: o spec de integração da lista trunca
// `shopping_list_items` em paralelo (pool de arquivos do vitest), então
// asserção de presença ali flutuaria. Provar rollback do DELETE + INSERT
// (item comprado restaurado) é papel do dono do truncate — ver handoff T-11.
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  PURCHASE_COMPLETED_EVENT_TYPE,
  PURCHASE_COMPLETED_EVENT_VERSION,
  type PurchaseCompletedEventV1,
} from '@lista/contracts';
import { createDb, type ShoppingListDb } from '../client';
import { type OutboxMessageRow, outboxMessages, shoppingListItems } from '../schema';
import { DrizzleOutboxRepository } from './outbox.repository';

const DB_TIMEOUT_MS = 30_000;

// Conexão/primeira query podem ser lentas no Windows; o timeout padrão de 5s
// é apertado para um spec que abre Pool de verdade.
vi.setConfig({ testTimeout: DB_TIMEOUT_MS, hookTimeout: DB_TIMEOUT_MS });

function envelopeFor(completionId: string): PurchaseCompletedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: PURCHASE_COMPLETED_EVENT_TYPE,
    eventVersion: PURCHASE_COMPLETED_EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    payload: {
      completionId,
      market: 'Hortifrúti da Esquina',
      purchaseDate: '2026-10-16',
      items: [{ name: 'Café', quantity: 1, unit: 'unidade', unitPrice: 12.9 }],
    },
  };
}

describe('Outbox do shopping-list com Postgres real (T-11)', () => {
  let db: ShoppingListDb;
  let repository: DrizzleOutboxRepository;
  const completionIds: string[] = [];
  const itemIds: string[] = [];

  function trackCompletion(): string {
    const completionId = randomUUID();
    completionIds.push(completionId);
    return completionId;
  }

  async function rowByCompletionId(
    completionId: string,
  ): Promise<OutboxMessageRow> {
    const rows = await db
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.completionId, completionId));
    const row = rows[0];
    if (row === undefined) {
      throw new Error(`Linha do outbox ausente para ${completionId}`);
    }
    return row;
  }

  beforeAll(() => {
    // O test-setup.ts defaulta DATABASE_URL; o `??` só satisfaz o type checker.
    db = createDb(process.env['DATABASE_URL'] ?? '');
    repository = new DrizzleOutboxRepository(db);
  });

  afterAll(async () => {
    if (completionIds.length > 0) {
      await db
        .delete(outboxMessages)
        .where(inArray(outboxMessages.completionId, completionIds));
    }
    if (itemIds.length > 0) {
      await db
        .delete(shoppingListItems)
        .where(inArray(shoppingListItems.id, itemIds));
    }
    await db.$client.end();
  });

  it('grava a mensagem pendente junto com a remoção dos comprados', async () => {
    const completionId = trackCompletion();
    const envelope = envelopeFor(completionId);
    const itemId = randomUUID();
    itemIds.push(itemId);
    await db.insert(shoppingListItems).values({
      id: itemId,
      name: 'Café T-11',
      nameNormalized: `cafe-t11-${completionId}`,
    });

    await repository.deletePurchasedAndEnqueue([itemId], envelope);

    const pending = await repository.findPending();
    const message = pending.find(
      (candidate) => candidate.completionId === completionId,
    );
    if (message === undefined) {
      throw new Error('Mensagem pendente não gravada no outbox');
    }
    expect(message).toMatchObject({
      id: expect.any(String),
      completionId,
      eventType: PURCHASE_COMPLETED_EVENT_TYPE,
      eventVersion: 1,
      envelope,
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });
    expect(message.createdAt).toBeInstanceOf(Date);

    // Absência (não contagem): o spec da lista trunca esta tabela em paralelo.
    const remaining = await db
      .select({ id: shoppingListItems.id })
      .from(shoppingListItems)
      .where(eq(shoppingListItems.id, itemId));
    expect(remaining).toHaveLength(0);
  });

  it('completion_id duplicado é recusado pelo índice único', async () => {
    const completionId = trackCompletion();
    await repository.deletePurchasedAndEnqueue([], envelopeFor(completionId));

    const failure = await repository
      .deletePurchasedAndEnqueue([], envelopeFor(completionId))
      .then(
        () => undefined,
        (error: unknown) => error,
      );

    expect(failure).toBeInstanceOf(Error);
    const rows = await db
      .select({ id: outboxMessages.id })
      .from(outboxMessages)
      .where(eq(outboxMessages.completionId, completionId));
    expect(rows).toHaveLength(1);
  });

  it('findPending devolve só as pendentes, mais antigas primeiro', async () => {
    const olderId = trackCompletion();
    const newerId = trackCompletion();
    const publishedId = trackCompletion();
    // createdAt explícito: now() poderia empatar duas inserções no mesmo ms e
    // o desempate por id (uuid aleatório) não seria FIFO.
    await db.insert(outboxMessages).values([
      {
        completionId: olderId,
        eventType: PURCHASE_COMPLETED_EVENT_TYPE,
        eventVersion: PURCHASE_COMPLETED_EVENT_VERSION,
        payload: envelopeFor(olderId),
        createdAt: new Date('2026-10-01T10:00:00Z'),
      },
      {
        completionId: newerId,
        eventType: PURCHASE_COMPLETED_EVENT_TYPE,
        eventVersion: PURCHASE_COMPLETED_EVENT_VERSION,
        payload: envelopeFor(newerId),
        createdAt: new Date('2026-10-02T10:00:00Z'),
      },
      {
        completionId: publishedId,
        eventType: PURCHASE_COMPLETED_EVENT_TYPE,
        eventVersion: PURCHASE_COMPLETED_EVENT_VERSION,
        payload: envelopeFor(publishedId),
        createdAt: new Date('2026-09-30T10:00:00Z'),
        publishedAt: new Date('2026-10-03T10:00:00Z'),
      },
    ]);

    const pending = await repository.findPending();
    const mine = pending
      .map((message) => message.completionId)
      .filter((id) => id === olderId || id === newerId || id === publishedId);

    expect(mine).toEqual([olderId, newerId]);
  });

  it('recordFailure soma tentativas e guarda o último erro', async () => {
    const completionId = trackCompletion();
    await repository.deletePurchasedAndEnqueue([], envelopeFor(completionId));
    const row = await rowByCompletionId(completionId);

    await repository.recordFailure(row.id, 'falha 1');
    await repository.recordFailure(row.id, 'falha 2');

    const reloaded = await rowByCompletionId(completionId);
    expect(reloaded.attempts).toBe(2);
    expect(reloaded.lastError).toBe('falha 2');
    // Erro não publica sozinho: continua na fila do publisher.
    expect(reloaded.publishedAt).toBeNull();
  });

  it('markPublished tira das pendentes, grava published_at e limpa lastError', async () => {
    const completionId = trackCompletion();
    await repository.deletePurchasedAndEnqueue([], envelopeFor(completionId));
    const row = await rowByCompletionId(completionId);
    await repository.recordFailure(row.id, 'broker indisponível');
    const publishedAt = new Date('2026-10-16T12:00:00Z');

    await repository.markPublished(row.id, publishedAt);

    const pending = await repository.findPending();
    expect(pending.some((message) => message.id === row.id)).toBe(false);
    const updated = await rowByCompletionId(completionId);
    expect(updated.publishedAt).toEqual(publishedAt);
    expect(updated.lastError).toBeNull();
    expect(updated.attempts).toBe(1);
  });
});
