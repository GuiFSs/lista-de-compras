import { describe, expect, it, vi } from 'vitest';
import {
  PurchaseCompletedConsumerService,
  type StartableConsumer,
} from './purchase-completed-consumer.service';

describe('PurchaseCompletedConsumerService (ciclo de vida)', () => {
  it('inicia o consumidor no onModuleInit e o para no onModuleDestroy', async () => {
    const start = vi.fn(async () => undefined);
    const stop = vi.fn(async () => undefined);
    const consumer: StartableConsumer = { start, stop };
    const service = new PurchaseCompletedConsumerService(consumer);

    await service.onModuleInit();
    expect(start).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
