import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPublisher } from '../../application/ports/event-publisher.port';
import { OutboxRepository } from '../../application/ports/outbox-repository.port';
import { OutboxRepositoryModule } from '../persistence/outbox-repository.module';
import { OutboxPublisher } from './outbox-publisher';
import { OutboxPublisherService } from './outbox-publisher.service';
import { RabbitmqEventPublisher } from './rabbitmq-event-publisher';

/**
 * Mensageria do produtor: adapter AMQP do `EventPublisher` e o ciclo periódico
 * que publica o outbox. O checkout **não** depende daqui — a intenção de
 * publicar já está no banco na mesma transação do DELETE (CD-06), e broker fora
 * só adia a entrega.
 */
@Module({
  imports: [OutboxRepositoryModule],
  providers: [
    {
      provide: EventPublisher,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new RabbitmqEventPublisher(config.getOrThrow<string>('RABBITMQ_URL')),
    },
    {
      provide: OutboxPublisher,
      inject: [OutboxRepository, EventPublisher],
      useFactory: (outbox: OutboxRepository, publisher: EventPublisher) => {
        const logger = new Logger('OutboxPublisher');
        return new OutboxPublisher(outbox, publisher, {
          logger: {
            error: (message, error) =>
              logger.error(
                message,
                error instanceof Error ? error.stack : String(error),
              ),
          },
        });
      },
    },
    OutboxPublisherService,
  ],
  exports: [EventPublisher],
})
export class MessagingModule {}
