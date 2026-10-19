import { describe, expect, it } from 'vitest';
import { connect } from 'amqplib';
import { PURCHASE_COMPLETED_ROUTING_KEY } from '@lista/contracts';
import { RabbitmqEventPublisher } from './rabbitmq-event-publisher';
import { DOMAIN_EVENTS_EXCHANGE } from './topology';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';

/**
 * Integração real com RabbitMQ (necessita Docker up): publicador assere o
 * exchange topic/durável, publica com a routing key correta e aceita confirms.
 */
describe('RabbitmqEventPublisher (integração)', () => {
  const sut = new RabbitmqEventPublisher(RABBIT_URL);
  const TIMEOUT = 30_000;

  it(
    'publica no exchange domain.events com routing key e recebe confirm',
    async () => {
      const connection = await connect(RABBIT_URL);
      const channel = await connection.createChannel();
      await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });

      // Fila temporária que recebe mensagens com a routing key exata.
      const queue = await channel.assertQueue('', { exclusive: true, durable: false });
      await channel.bindQueue(queue.queue, DOMAIN_EVENTS_EXCHANGE, PURCHASE_COMPLETED_ROUTING_KEY);

      const event = {
        eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        eventType: 'shopping-list.purchase-completed' as const,
        eventVersion: 1 as const,
        occurredAt: '2026-01-01T12:00:00.000Z',
        payload: {
          completionId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          market: 'Mercado Central',
          purchaseDate: '2026-01-01',
          items: [{ name: 'Café', quantity: 2, unit: 'kg' as const, unitPrice: 9.9 }],
        },
      };

      await sut.publish(event);
      const msg = await channel.get(queue.queue, { noAck: true });
      expect(msg).not.toBeNull();
      if (msg === null) return;
      expect(msg.fields.exchange).toBe(DOMAIN_EVENTS_EXCHANGE);
      expect(msg.fields.routingKey).toBe(PURCHASE_COMPLETED_ROUTING_KEY);
      expect(msg.properties.messageId).toBe(event.eventId);
      expect(msg.properties.type).toBe(event.eventType);
      expect(msg.properties.contentType).toBe('application/json');
      expect(msg.properties.deliveryMode).toBe(2);
      const body = JSON.parse(msg.content.toString());
      expect(body).toEqual(event);

      await channel.deleteQueue(queue.queue);
      await channel.close();
      await connection.close();
      await sut.close();
    },
    TIMEOUT,
  );
});
