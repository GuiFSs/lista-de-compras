import type { PurchaseCompletedEventV1 } from '@lista/contracts';

/**
 * Publicação de eventos de domínio no broker. O checkout não fala com este
 * port: a conclusão grava o outbox e o publisher da T-12 publica com retry —
 * o HTTP não pode depender do RabbitMQ (CD-06).
 */
export abstract class EventPublisher {
  /** Envia o envelope ao broker; falha propaga para o retry do publisher decidir. */
  abstract publish(event: PurchaseCompletedEventV1): Promise<void>;
}
