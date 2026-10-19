import type { Channel } from 'amqplib';
import { PURCHASE_COMPLETED_ROUTING_KEY } from '@lista/contracts';

/**
 * Exchange topic durável de eventos de domínio, compartilhado pelos serviços
 * (ADR 0001). Mesmo valor do topólogo do produtor — duplicado aqui para não
 * criar dependência entre serviços.
 */
export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

/** Fila exclusiva deste consumidor; durável para sobreviver a restart. */
export const PURCHASE_COMPLETED_QUEUE =
  'price-history.shopping-list.purchase-completed';

/**
 * Topologia do consumidor. Os três `assert` são idempotentes, então rodam a
 * cada conexão (inclusive nas reconexões por backoff).
 */
export async function assertConsumerTopology(
  channel: Channel,
  queue: string = PURCHASE_COMPLETED_QUEUE,
): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', {
    durable: true,
  });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(
    queue,
    DOMAIN_EVENTS_EXCHANGE,
    PURCHASE_COMPLETED_ROUTING_KEY,
  );
}
