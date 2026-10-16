// Adaptador de mensageria (RabbitMQ - ADR 0001). A T-11 traz só os tipos do
// envelope publicado — o publisher (exchange, routing key, retry) é a T-12.
// Por isso os exports são type-only: ainda não há implementação aqui.
export type { PurchaseCompletedEventV1 } from '@lista/contracts';
