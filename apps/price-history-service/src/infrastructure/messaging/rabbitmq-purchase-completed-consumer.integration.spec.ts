// Integração real com RabbitMQ (necessita Docker up, como o publisher da T-12):
// prova bind da routing key, ack após ingest, idempotência por completionId na
// ponta do broker (AC-16), nack/requeue em falha transitória e descarte de
// envelope inválido. Cada caso usa fila de teste com nome único e a remove ao
// final — a fila de produção fica intocada.
import { randomUUID } from 'node:crypto';
import { connect } from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';
import { PURCHASE_COMPLETED_ROUTING_KEY } from '@lista/contracts';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  IngestPurchaseUseCase,
  PurchaseRepository,
  type PurchaseSummary,
} from '../../application';
import type { PriceHistoryPurchase } from '../../domain/purchase';
import { InMemoryPurchaseRepository } from '../../application/use-cases/testing/in-memory-purchase-repository';
import type {
  ConsumeDecision,
  MessageHandling,
} from './purchase-completed-handler';
import { PurchaseCompletedHandler } from './purchase-completed-handler';
import { RabbitmqPurchaseCompletedConsumer } from './rabbitmq-purchase-completed-consumer';
import { DOMAIN_EVENTS_EXCHANGE } from './topology';

// Conexão + entrega em Windows podem passar de 5s; espelha a suíte da T-06.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const RABBIT_URL =
  process.env['RABBITMQ_URL'] ?? 'amqp://guest:guest@localhost:5672';

const completedEvent = (completionId: string) => ({
  eventId: randomUUID(),
  eventType: 'shopping-list.purchase-completed',
  eventVersion: 1,
  occurredAt: '2026-10-01T12:00:00.000Z',
  payload: {
    completionId,
    market: 'Mercado Central',
    purchaseDate: '2026-10-01',
    items: [{ name: 'Café', quantity: 2, unit: 'kg', unitPrice: 9.9 }],
  },
});

/** Primeira tentativa de insert falha, depois delega — simula banco fora. */
class FlakyPurchaseRepository extends PurchaseRepository {
  private readonly inner = new InMemoryPurchaseRepository();
  private failures = 1;

  async insert(purchase: PriceHistoryPurchase): Promise<boolean> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('banco indisponível');
    }
    return this.inner.insert(purchase);
  }

  async listSummaries(): Promise<PurchaseSummary[]> {
    return this.inner.listSummaries();
  }

  async findById(id: string): Promise<PriceHistoryPurchase | null> {
    return this.inner.findById(id);
  }

  async findAllWithItems(): Promise<PriceHistoryPurchase[]> {
    return this.inner.findAllWithItems();
  }

  count(): number {
    return this.inner.count();
  }
}

/** Grava cada decisão observada — o consumidor só enxerga a porta. */
class RecordingHandler implements MessageHandling {
  public readonly decisions: ConsumeDecision[] = [];

  constructor(private readonly inner: MessageHandling) {}

  async handle(raw: string): Promise<ConsumeDecision> {
    const decision = await this.inner.handle(raw);
    this.decisions.push(decision);
    return decision;
  }
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('RabbitmqPurchaseCompletedConsumer (integração RabbitMQ real)', () => {
  let connection: ChannelModel;
  let channel: Channel;
  let activeConsumer: RabbitmqPurchaseCompletedConsumer | null = null;
  let currentQueue: string | null = null;

  beforeAll(async () => {
    connection = await connect(RABBIT_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
  });

  afterEach(async () => {
    if (activeConsumer !== null) {
      await activeConsumer.stop();
      activeConsumer = null;
    }
    if (currentQueue !== null) {
      await channel.deleteQueue(currentQueue).catch(() => undefined);
      currentQueue = null;
    }
  });

  function uniqueQueue(): string {
    currentQueue = `price-history.test.purchase-completed.${randomUUID()}`;
    return currentQueue;
  }

  function startConsumer(
    repository: PurchaseRepository,
    queue: string,
  ): { consumer: RabbitmqPurchaseCompletedConsumer; record: RecordingHandler } {
    const record = new RecordingHandler(
      new PurchaseCompletedHandler(new IngestPurchaseUseCase(repository)),
    );
    const consumer = new RabbitmqPurchaseCompletedConsumer({
      url: RABBIT_URL,
      queue,
      handler: record,
    });
    activeConsumer = consumer;
    return { consumer, record };
  }

  function publish(raw: string): void {
    channel.publish(
      DOMAIN_EVENTS_EXCHANGE,
      PURCHASE_COMPLETED_ROUTING_KEY,
      Buffer.from(raw),
      { contentType: 'application/json', persistent: true },
    );
  }

  /** Só ack drenou a fila: sem ack, o stop devolveria a mensagem (requeue). */
  async function expectQueueDrained(queue: string): Promise<void> {
    const check = await channel.checkQueue(queue);
    expect(check.messageCount).toBe(0);
  }

  it('exchange → fila → ingest com ack; 2 publicações do mesmo completionId = 1 registro (AC-16)', async () => {
    const queue = uniqueQueue();
    const repository = new InMemoryPurchaseRepository();
    const { consumer, record } = startConsumer(repository, queue);
    await consumer.start();

    const event = completedEvent(randomUUID());
    publish(JSON.stringify(event));
    publish(JSON.stringify({ ...event, eventId: randomUUID() }));

    await vi.waitFor(
      () => {
        expect(
          record.decisions.filter((decision) => decision.action === 'ack'),
        ).toHaveLength(2);
      },
      { timeout: 10_000, interval: 50 },
    );
    // 2ª entrega acknowledgeada como reentrega idempotente, sem segundo registro.
    expect(record.decisions).toEqual([
      { action: 'ack', id: event.payload.completionId, created: true },
      { action: 'ack', id: event.payload.completionId, created: false },
    ]);
    // Janela entre a decisão e o ack no callback da fila.
    await delay(100);
    await consumer.stop();
    activeConsumer = null;

    await expectQueueDrained(queue);
    expect(repository.count()).toBe(1);
  });

  it('falha transitória → nack/requeue entrega de novo e a 2ª tentativa persiste', async () => {
    const queue = uniqueQueue();
    const repository = new FlakyPurchaseRepository();
    const { consumer, record } = startConsumer(repository, queue);
    await consumer.start();

    publish(JSON.stringify(completedEvent(randomUUID())));

    await vi.waitFor(
      () => {
        expect(record.decisions).toHaveLength(2);
      },
      { timeout: 10_000, interval: 50 },
    );
    // Só houve 2ª entrega porque a 1ª foi requeue'ada; depois persiste e ack.
    expect(record.decisions[0]).toEqual({
      action: 'nack',
      requeue: true,
      reason: 'ingest-failed',
      error: expect.any(Error),
    });
    expect(record.decisions[1]).toMatchObject({ action: 'ack', created: true });
    await delay(100);
    await consumer.stop();
    activeConsumer = null;

    await expectQueueDrained(queue);
    expect(repository.count()).toBe(1);
  });

  it('envelope inválido é descartado (sem requeue) e nada é ingerido', async () => {
    const queue = uniqueQueue();
    const repository = new InMemoryPurchaseRepository();
    const { consumer, record } = startConsumer(repository, queue);
    await consumer.start();

    publish('{"eventType":"indefinido","eventVersion":1,"payload":{}}');

    await vi.waitFor(
      () => {
        expect(record.decisions).toHaveLength(1);
      },
      { timeout: 10_000, interval: 50 },
    );
    expect(record.decisions[0]).toEqual({
      action: 'nack',
      requeue: false,
      reason: 'invalid-envelope',
    });
    await delay(100);
    await consumer.stop();
    activeConsumer = null;

    expect(repository.count()).toBe(0);
    await expectQueueDrained(queue);
  });
});
