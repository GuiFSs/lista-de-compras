import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IngestPurchaseUseCase } from '../../application';
import { PurchaseRepository } from '../../application/ports/purchase-repository.port';
import { PurchaseRepositoryModule } from '../persistence/purchase-repository.module';
import { PurchaseCompletedConsumerService } from './purchase-completed-consumer.service';
import { PurchaseCompletedHandler } from './purchase-completed-handler';
import { RabbitmqPurchaseCompletedConsumer } from './rabbitmq-purchase-completed-consumer';

// Sob o Vitest o AppModule também sobe nos specs de HTTP; sem este corte, todo
// `nx test` abriria um consumidor na fila de produção e poderia dar ack em
// evento real no repositório de teste (ingestão perdida em dev). Os specs de
// integração instanciam o consumidor direto, sem este módulo.
const isTestRun = process.env['VITEST'] !== undefined;

/**
 * Mensageria do consumidor: provisiona `IngestPurchaseUseCase` com a port
 * `PurchaseRepository` (decisão registrada no handoff T-08) e o adapter AMQP
 * que consome `shopping-list.purchase-completed`. O checkout do histórico
 * depende só do evento — nunca do banco da lista (RN-02/AC-17).
 */
@Module({
  imports: [PurchaseRepositoryModule],
  providers: [
    {
      provide: IngestPurchaseUseCase,
      inject: [PurchaseRepository],
      useFactory: (repository: PurchaseRepository) =>
        new IngestPurchaseUseCase(repository),
    },
    {
      provide: PurchaseCompletedHandler,
      inject: [IngestPurchaseUseCase],
      useFactory: (ingest: IngestPurchaseUseCase) =>
        new PurchaseCompletedHandler(ingest),
    },
    {
      provide: RabbitmqPurchaseCompletedConsumer,
      inject: [ConfigService, PurchaseCompletedHandler],
      useFactory: (config: ConfigService, handler: PurchaseCompletedHandler) =>
        new RabbitmqPurchaseCompletedConsumer({
          url: config.get<string>('RABBITMQ_URL'),
          handler,
        }),
    },
    ...(isTestRun ? [] : [PurchaseCompletedConsumerService]),
  ],
})
export class MessagingModule {}
