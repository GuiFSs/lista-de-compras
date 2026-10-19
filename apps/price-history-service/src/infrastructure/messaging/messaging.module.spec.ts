import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IngestPurchaseUseCase } from '../../application';
import { PurchaseCompletedConsumerService } from './purchase-completed-consumer.service';
import { PurchaseCompletedHandler } from './purchase-completed-handler';
import { MessagingModule } from './messaging.module';
import { RabbitmqPurchaseCompletedConsumer } from './rabbitmq-purchase-completed-consumer';

describe('MessagingModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), MessagingModule],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('provisiona IngestPurchaseUseCase, handler e consumidor (decisão do handoff T-08)', () => {
    expect(moduleRef.get(IngestPurchaseUseCase)).toBeInstanceOf(
      IngestPurchaseUseCase,
    );
    expect(moduleRef.get(PurchaseCompletedHandler)).toBeInstanceOf(
      PurchaseCompletedHandler,
    );
    expect(moduleRef.get(RabbitmqPurchaseCompletedConsumer)).toBeInstanceOf(
      RabbitmqPurchaseCompletedConsumer,
    );
  });

  it('sob Vitest não registra o ciclo de vida — specs HTTP não disputam a fila de produção', () => {
    expect(() => moduleRef.get(PurchaseCompletedConsumerService)).toThrow();
  });
});
