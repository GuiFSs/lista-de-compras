import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventPublisher } from '../../application/ports/event-publisher.port';
import { OutboxPublisher } from './outbox-publisher';

/** O port não fala de ciclo de vida; o adapter AMQP sabe fechar a conexão. */
interface ClosableEventPublisher extends EventPublisher {
  close(): Promise<void>;
}

function isClosable(publisher: EventPublisher): publisher is ClosableEventPublisher {
  return 'close' in publisher;
}

/**
 * Ciclo de vida do publisher do outbox no processo: inicia o ciclo periódico na
 * subida e o para no shutdown (fechando a conexão do broker, quando houver).
 */
@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(OutboxPublisher) private readonly publisher: OutboxPublisher,
    @Inject(EventPublisher) private readonly transport: EventPublisher,
  ) {}

  onModuleInit(): void {
    this.publisher.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.publisher.stop();
    if (isClosable(this.transport)) {
      await this.transport.close();
    }
  }
}
