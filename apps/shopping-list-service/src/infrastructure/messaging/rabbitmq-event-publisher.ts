import { connect } from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import { PURCHASE_COMPLETED_ROUTING_KEY } from '@lista/contracts';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import type { EventPublisher } from '../../application/ports/event-publisher.port';
import { DOMAIN_EVENTS_EXCHANGE, assertPublisherTopology } from './topology';

/**
 * Adapter AMQP do `EventPublisher`: publica o envelope v1 no exchange
 * `domain.events` sob a routing key do contrato. A conexão é preguiçosa (o
 * serviço sobe sem broker) e descartada em qualquer falha — o retry do
 * publisher do outbox reconecta no próximo ciclo (CD-06).
 */
export class RabbitmqEventPublisher implements EventPublisher {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(private readonly url: string) {}

  async publish(event: PurchaseCompletedEventV1): Promise<void> {
    try {
      const channel = await this.connect();
      channel.publish(
        DOMAIN_EVENTS_EXCHANGE,
        PURCHASE_COMPLETED_ROUTING_KEY,
        Buffer.from(JSON.stringify(event)),
        {
          contentType: 'application/json',
          persistent: true,
          messageId: event.eventId,
          type: event.eventType,
        },
      );
      // Sem o confirm o outbox marcaria como publicada uma mensagem que o broker
      // não confirmou.
      await channel.waitForConfirms();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  /** Fecha a conexão (shutdown do processo); a próxima publicação reconecta. */
  async close(): Promise<void> {
    const connection = this.connection;
    this.discard();
    if (connection === null) {
      return;
    }
    try {
      await connection.close();
    } catch {
      // Conexão já caiu: não há o que fechar.
    }
  }

  private async connect(): Promise<ConfirmChannel> {
    if (this.channel !== null) {
      return this.channel;
    }
    const connection = await connect(this.url);
    // Sem listener, um `error` de socket derrubaria o processo.
    connection.on('error', () => this.discard());
    connection.on('close', () => this.discard());
    const channel = await connection.createConfirmChannel();
    channel.on('close', () => this.discard());
    await assertPublisherTopology(channel);
    this.connection = connection;
    this.channel = channel;
    return channel;
  }

  private discard(): void {
    this.channel = null;
    this.connection = null;
  }
}
