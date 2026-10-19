import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RabbitmqPurchaseCompletedConsumer } from './rabbitmq-purchase-completed-consumer';

/** O ciclo de vida só depende de start/stop — duplo de teste sem amqplib. */
export interface StartableConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Sobe o consumidor junto do app e o derruba no shutdown. `start()` não
 * propaga falha de broker (log + backoff), então a subida do HTTP nunca
 * depende do RabbitMQ estar no ar.
 */
@Injectable()
export class PurchaseCompletedConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(RabbitmqPurchaseCompletedConsumer)
    private readonly consumer: StartableConsumer,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.stop();
  }
}
