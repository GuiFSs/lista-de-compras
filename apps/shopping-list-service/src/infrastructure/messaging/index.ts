// Adaptador de mensageria (RabbitMQ — ADR 0001): publicação do outbox com retry.
// O consumo do evento é do `price-history-service` (T-09); aqui só o produtor.
export { MessagingModule } from './messaging.module';
export { OutboxPublisher } from './outbox-publisher';
export type {
  OutboxPublishFailure,
  OutboxPublishReport,
  OutboxPublisherLogger,
  OutboxPublisherOptions,
} from './outbox-publisher';
export { OutboxPublisherService } from './outbox-publisher.service';
export { RabbitmqEventPublisher } from './rabbitmq-event-publisher';
export { DOMAIN_EVENTS_EXCHANGE, assertPublisherTopology } from './topology';
export type { PurchaseCompletedEventV1 } from '@lista/contracts';
