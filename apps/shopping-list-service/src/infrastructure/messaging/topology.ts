import type { Channel } from 'amqplib';

/**
 * Exchange de eventos de domínio do PLAN (`domain.events`, topic, durável) —
 * compartilhado pelos produtores/consumidores dos serviços (ADR 0001). A fila e
 * o bind são do consumidor (`price-history-service`); aqui só se garante o
 * exchange antes de publicar.
 */
export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

/** Garante o exchange do produtor; `assert` é idempotente, então roda a cada publish. */
export async function assertPublisherTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', {
    durable: true,
  });
}
