import { describe, expect, it, vi } from 'vitest';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxPublisher } from './outbox-publisher';
import type { EventPublisher } from '../../application/ports/event-publisher.port';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import { InMemoryOutboxRepository } from '../../application/use-cases/testing/in-memory-outbox-repository';
import { InMemoryShoppingListRepository } from '../../application/use-cases/testing/in-memory-shopping-list-repository';

class StubTransport implements EventPublisher {
  public messages: PurchaseCompletedEventV1[] = [];
  async publish(event: PurchaseCompletedEventV1): Promise<void> { this.messages.push(event); }
}

class ClosableStubTransport extends StubTransport {
  public closed = false;
  async close(): Promise<void> { this.closed = true; }
}

function makeEnvelope(completionId: string): PurchaseCompletedEventV1 {
  return {
    eventId: `id-${completionId}`,
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

describe('OutboxPublisherService (ciclo de vida)', () => {
  it('inicia o publisher no OnModuleInit e publica pendentes', async () => {
    vi.useFakeTimers();
    try {
      const list = new InMemoryShoppingListRepository([]);
      const outbox = new InMemoryOutboxRepository(list);
      await outbox.deletePurchasedAndEnqueue([], makeEnvelope('c1'));
      const transport = new StubTransport();
      const publisher = new OutboxPublisher(outbox, transport, { intervalMs: 50 });
      const service = new OutboxPublisherService(publisher, transport);
      service.onModuleInit();
      await vi.advanceTimersByTimeAsync(50);
      expect(transport.messages).toHaveLength(1);
      vi.useRealTimers();
      await service.onModuleDestroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fecha a conexão do transport no OnModuleDestroy', async () => {
    const list = new InMemoryShoppingListRepository([]);
    const outbox = new InMemoryOutboxRepository(list);
    const transport = new ClosableStubTransport();
    const publisher = new OutboxPublisher(outbox, transport, { intervalMs: 50 });
    const service = new OutboxPublisherService(publisher, transport);
    service.onModuleInit();
    await service.onModuleDestroy();
    expect(transport.closed).toBe(true);
  });
});
