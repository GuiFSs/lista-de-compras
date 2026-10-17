import { describe, expect, it, vi } from 'vitest';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import {
  IngestPurchaseUseCase,
  PurchaseRepository,
  type PurchaseSummary,
} from '../../application';
import type { PriceHistoryPurchase } from '../../domain/purchase';
import { InMemoryPurchaseRepository } from '../../application/use-cases/testing/in-memory-purchase-repository';
import { PurchaseCompletedHandler } from './purchase-completed-handler';
import type {
  ConsumableMessage,
  MessageAcknowledger,
} from './rabbitmq-purchase-completed-consumer';
import { RabbitmqPurchaseCompletedConsumer } from './rabbitmq-purchase-completed-consumer';

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

function messageOf(raw: string): ConsumableMessage {
  return { content: Buffer.from(raw), properties: { messageId: 'msg-1' } };
}

class RecordingAcknowledger implements MessageAcknowledger {
  public readonly acked: ConsumableMessage[] = [];
  public readonly nacked: Array<{
    message: ConsumableMessage;
    allUpTo?: boolean | undefined;
    requeue?: boolean | undefined;
  }> = [];

  ack(message: ConsumableMessage): void {
    this.acked.push(message);
  }

  nack(message: ConsumableMessage, allUpTo?: boolean, requeue?: boolean): void {
    this.nacked.push({ message, allUpTo, requeue });
  }
}

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

/** URL nunca usada: handleDelivery não toca em conexão (é puro de broker). */
function makeConsumer(handler: PurchaseCompletedHandler): RabbitmqPurchaseCompletedConsumer {
  return new RabbitmqPurchaseCompletedConsumer({
    url: 'amqp://unused:unused@localhost:5672',
    handler,
  });
}

function handlerFor(repository: PurchaseRepository): PurchaseCompletedHandler {
  return new PurchaseCompletedHandler(new IngestPurchaseUseCase(repository));
}

describe('RabbitmqPurchaseCompletedConsumer (unidade)', () => {
  it('ingest OK → ack; recusa permanente → nack sem requeue; transitória → nack com requeue', async () => {
    const consumer = makeConsumer(handlerFor(new InMemoryPurchaseRepository()));
    const ack = new RecordingAcknowledger();
    const nack = new RecordingAcknowledger();
    const transient = new RecordingAcknowledger();
    const transientConsumer = makeConsumer(handlerFor(new ThrowingPurchaseRepository()));

    await consumer.handleDelivery(messageOf(JSON.stringify(makeEvent())), ack);
    await consumer.handleDelivery(messageOf('{não é json'), nack);
    await transientConsumer.handleDelivery(
      messageOf(JSON.stringify(makeEvent())),
      transient,
    );

    expect(ack.acked).toHaveLength(1);
    expect(ack.nacked).toHaveLength(0);
    expect(nack.nacked).toEqual([
      { message: expect.anything(), allUpTo: false, requeue: false },
    ]);
    expect(nack.acked).toHaveLength(0);
    expect(transient.nacked).toEqual([
      { message: expect.anything(), allUpTo: false, requeue: true },
    ]);
  });

  it('exceção inesperada do handler → nack com requeue (caminho seguro)', async () => {
    const handler = handlerFor(new InMemoryPurchaseRepository());
    vi.spyOn(handler, 'handle').mockRejectedValue(new Error('bug no handler'));
    const consumer = makeConsumer(handler);
    const ack = new RecordingAcknowledger();

    await consumer.handleDelivery(messageOf(JSON.stringify(makeEvent())), ack);

    expect(ack.acked).toHaveLength(0);
    expect(ack.nacked).toEqual([
      { message: expect.anything(), allUpTo: false, requeue: true },
    ]);
  });

  it('start sem RABBITMQ_URL resolve sem conectar (app HTTP não cai)', async () => {
    const consumer = new RabbitmqPurchaseCompletedConsumer({
      url: undefined,
      handler: handlerFor(new InMemoryPurchaseRepository()),
    });

    await expect(consumer.start()).resolves.toBeUndefined();
    await consumer.stop();
  });

  it('start com broker inacessível resolve (log + backoff) e stop cancela o retry', async () => {
    const consumer = new RabbitmqPurchaseCompletedConsumer({
      url: 'amqp://guest:guest@127.0.0.1:5671',
      handler: handlerFor(new InMemoryPurchaseRepository()),
    });

    await expect(consumer.start()).resolves.toBeUndefined();
    await consumer.stop();
    // Segundo stop é idempotente — shutdown pode ser chamado mais de uma vez.
    await expect(consumer.stop()).resolves.toBeUndefined();
  });
});
