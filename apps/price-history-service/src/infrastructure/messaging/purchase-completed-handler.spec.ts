import { describe, expect, it } from 'vitest';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import {
  IngestPurchaseUseCase,
  PurchaseRepository,
  type PurchaseSummary,
} from '../../application';
import type { PriceHistoryPurchase } from '../../domain/purchase';
import { InMemoryPurchaseRepository } from '../../application/use-cases/testing/in-memory-purchase-repository';
import { PurchaseCompletedHandler } from './purchase-completed-handler';

const COMPLETION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function makeEvent(): PurchaseCompletedEventV1 {
  return {
    eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    eventType: 'shopping-list.purchase-completed',
    eventVersion: 1,
    occurredAt: '2026-10-01T12:00:00.000Z',
    payload: {
      completionId: COMPLETION_ID,
      market: 'Mercado Central',
      purchaseDate: '2026-10-01',
      items: [{ name: 'Café', quantity: 2, unit: 'kg', unitPrice: 9.9 }],
    },
  };
}

function rawBody(event: unknown): string {
  return JSON.stringify(event);
}

/** Falha de repositório é transitória por definição — o consumidor é que decide. */
class ThrowingPurchaseRepository extends PurchaseRepository {
  async insert(): Promise<boolean> {
    throw new Error('banco indisponível');
  }
  async listSummaries(): Promise<PurchaseSummary[]> {
    return [];
  }
  async findById(): Promise<PriceHistoryPurchase | null> {
    return null;
  }
  async findAllWithItems(): Promise<PriceHistoryPurchase[]> {
    return [];
  }
}

function makeHandler(repository: PurchaseRepository): PurchaseCompletedHandler {
  return new PurchaseCompletedHandler(new IngestPurchaseUseCase(repository));
}

describe('PurchaseCompletedHandler', () => {
  it('evento válido → ack com created true e a compra fica no repositório', async () => {
    const repository = new InMemoryPurchaseRepository();
    const handler = makeHandler(repository);

    const decision = await handler.handle(rawBody(makeEvent()));

    expect(decision).toEqual({
      action: 'ack',
      id: COMPLETION_ID,
      created: true,
    });
    expect(repository.count()).toBe(1);
  });

  it('reentrega do mesmo completionId → ack com created false e 1 registro (AC-16/RN-11)', async () => {
    const repository = new InMemoryPurchaseRepository();
    const handler = makeHandler(repository);
    const raw = rawBody(makeEvent());

    const first = await handler.handle(raw);
    const second = await handler.handle(raw);

    expect(first).toEqual({
      action: 'ack',
      id: COMPLETION_ID,
      created: true,
    });
    expect(second).toEqual({
      action: 'ack',
      id: COMPLETION_ID,
      created: false,
    });
    expect(repository.count()).toBe(1);
  });

  it('falha do repositório → nack com requeue (falha transitória)', async () => {
    const handler = makeHandler(new ThrowingPurchaseRepository());

    const decision = await handler.handle(rawBody(makeEvent()));

    expect(decision).toEqual({
      action: 'nack',
      requeue: true,
      reason: 'ingest-failed',
      error: expect.any(Error),
    });
  });

  it('JSON inválido → nack sem requeue com motivo invalid-json', async () => {
    const handler = makeHandler(new InMemoryPurchaseRepository());

    const decision = await handler.handle('{não é json');

    expect(decision).toEqual({
      action: 'nack',
      requeue: false,
      reason: 'invalid-json',
    });
  });

  it('eventType fora do contrato → invalid-envelope sem requeue', async () => {
    const handler = makeHandler(new InMemoryPurchaseRepository());
    const raw = rawBody({ ...makeEvent(), eventType: 'outra.evento' });

    const decision = await handler.handle(raw);

    expect(decision).toEqual({
      action: 'nack',
      requeue: false,
      reason: 'invalid-envelope',
    });
  });

  it('eventVersion 2 → invalid-envelope sem requeue (só a v1 é consumida)', async () => {
    const handler = makeHandler(new InMemoryPurchaseRepository());
    const raw = rawBody({ ...makeEvent(), eventVersion: 2 });

    const decision = await handler.handle(raw);

    expect(decision).toEqual({
      action: 'nack',
      requeue: false,
      reason: 'invalid-envelope',
    });
  });

  it('payload não é objeto → invalid-envelope sem requeue', async () => {
    const handler = makeHandler(new InMemoryPurchaseRepository());
    const raw = rawBody({ ...makeEvent(), payload: null });

    const decision = await handler.handle(raw);

    expect(decision).toEqual({
      action: 'nack',
      requeue: false,
      reason: 'invalid-envelope',
    });
  });

  it('payload recusado pelo domínio → motivo do domínio sem requeue', async () => {
    const repository = new InMemoryPurchaseRepository();
    const handler = makeHandler(repository);
    const raw = rawBody({
      ...makeEvent(),
      payload: { ...makeEvent().payload, market: '   ' },
    });

    const decision = await handler.handle(raw);

    expect(decision).toEqual({
      action: 'nack',
      requeue: false,
      reason: 'market-required',
    });
    expect(repository.count()).toBe(0);
  });
});
