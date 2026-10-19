import { Logger } from '@nestjs/common';
import { connect } from 'amqplib';
import type { ChannelModel } from 'amqplib';
import type {
  ConsumeDecision,
  MessageHandling,
} from './purchase-completed-handler';
import { PURCHASE_COMPLETED_QUEUE, assertConsumerTopology } from './topology';

const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

/** Decodificação mínima de uma mensagem — `ConsumeMessage` do amqplib satisfaz. */
export interface ConsumableMessage {
  readonly content: Buffer;
  readonly properties: { readonly messageId?: string | undefined };
}

/** Só o que a decisão exige do canal — permite testar sem broker. */
export interface MessageAcknowledger {
  ack(message: ConsumableMessage): void;
  nack(message: ConsumableMessage, allUpTo?: boolean, requeue?: boolean): void;
}

export interface RabbitmqConsumerOptions {
  /** `undefined` desliga o consumidor com aviso; o app HTTP sobe assim mesmo. */
  readonly url: string | undefined;
  readonly handler: MessageHandling;
  /** Fila própria por padrão; specs usam nomes únicos para não disputar a produção. */
  readonly queue?: string;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return error === undefined ? undefined : String(error);
}

async function closeQuietly(connection: ChannelModel): Promise<void> {
  try {
    await connection.close();
  } catch {
    // Conexão já caiu: não há o que fechar.
  }
}

/**
 * Consumidor da fila de `shopping-list.purchase-completed` (at-least-once):
 * ack só após ingest OK, recusa permanente sem requeue, falha transitória com
 * requeue. A subida nunca propaga erro de broker — vira log + backoff — para a
 * borda HTTP não depender do RabbitMQ (PLAN T-09).
 */
export class RabbitmqPurchaseCompletedConsumer {
  private connection: ChannelModel | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayMs = INITIAL_RETRY_DELAY_MS;
  private started = false;
  private readonly queue: string;
  private readonly logger = new Logger(RabbitmqPurchaseCompletedConsumer.name);

  constructor(private readonly options: RabbitmqConsumerOptions) {
    this.queue = options.queue ?? PURCHASE_COMPLETED_QUEUE;
  }

  async start(): Promise<void> {
    if (this.options.url === undefined) {
      this.logger.warn(
        'RABBITMQ_URL ausente — consumidor de purchase-completed não iniciado',
      );
      return;
    }
    if (this.started) {
      return;
    }
    this.started = true;
    await this.connectOnce();
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const connection = this.connection;
    this.discard();
    if (connection === null) {
      return;
    }
    await closeQuietly(connection);
  }

  /**
   * Aplica a decisão do handler no canal. Público para os specs de unidade
   * exercitarem ack/nack sem broker; em produção o callback da fila chama este
   * método. Nunca rejeita — erro do canal vira log (o broker reenfileira sozinho).
   */
  async handleDelivery(
    message: ConsumableMessage,
    acknowledger: MessageAcknowledger,
  ): Promise<void> {
    const decision = await this.decide(message);
    try {
      if (decision.action === 'ack') {
        acknowledger.ack(message);
        this.logger.log(
          `ingestão concluída: completionId=${decision.id} created=${decision.created} messageId=${message.properties.messageId ?? '-'}`,
        );
      } else {
        acknowledger.nack(message, false, decision.requeue);
        this.logRejection(decision, message);
      }
    } catch (error) {
      this.logger.error(
        `falha ao ack/nack messageId=${message.properties.messageId ?? '-'}: ${errorText(error)}`,
      );
    }
  }

  private async decide(message: ConsumableMessage): Promise<ConsumeDecision> {
    try {
      return await this.options.handler.handle(message.content.toString('utf8'));
    } catch (error) {
      // Defesa: o handler já mapeia falhas; se ele explodir, reentregar é o
      // caminho seguro (idempotência cobre a duplicata).
      return { action: 'nack', requeue: true, reason: 'handler-failed', error };
    }
  }

  private logRejection(
    decision: Extract<ConsumeDecision, { action: 'nack' }>,
    message: ConsumableMessage,
  ): void {
    const detail = `motivo=${decision.reason} messageId=${message.properties.messageId ?? '-'}`;
    if (decision.requeue) {
      this.logger.error(
        `ingestão falhou; mensagem devolvida à fila (${detail})`,
        errorStack(decision.error),
      );
    } else {
      this.logger.warn(`mensagem descartada sem requeue (${detail})`);
    }
  }

  private async connectOnce(): Promise<void> {
    if (!this.started || this.options.url === undefined) {
      return;
    }
    let connection: ChannelModel | null = null;
    try {
      connection = await connect(this.options.url);
      if (!this.started) {
        await closeQuietly(connection);
        return;
      }
      // Sem listener, um `error` de socket derrubaria o processo.
      connection.on('error', (error: Error) => this.handleDisconnect(error));
      connection.on('close', () => this.handleDisconnect());
      const channel = await connection.createChannel();
      channel.on('error', (error: Error) => this.handleDisconnect(error));
      channel.on('close', () => this.handleDisconnect());
      await assertConsumerTopology(channel, this.queue);
      // Uma mensagem em voo por vez: entrega FIFO best-effort (PLAN — Eventos).
      await channel.prefetch(1);
      await channel.consume(
        this.queue,
        (message) => {
          if (message === null) {
            return; // cancelamento pelo servidor; o `close` cuida da reconexão
          }
          void this.handleDelivery(message, channel);
        },
        { noAck: false },
      );
      this.connection = connection;
      this.retryDelayMs = INITIAL_RETRY_DELAY_MS;
      this.logger.log(`consumindo fila ${this.queue}`);
    } catch (error) {
      this.discard();
      if (connection !== null) {
        await closeQuietly(connection);
      }
      this.scheduleRetry(error);
    }
  }

  private handleDisconnect(cause?: unknown): void {
    const connection = this.connection;
    this.discard();
    if (connection !== null) {
      void closeQuietly(connection);
    }
    if (this.started) {
      this.scheduleRetry(cause);
    }
  }

  private scheduleRetry(cause?: unknown): void {
    if (!this.started || this.retryTimer !== null) {
      return;
    }
    const delay = this.retryDelayMs;
    const detail =
      cause === undefined ? 'conexão com o broker encerrada' : errorText(cause);
    this.logger.warn(`${detail}; nova tentativa em ${delay}ms`);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.connectOnce();
    }, delay);
    this.retryDelayMs = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
  }

  private discard(): void {
    this.connection = null;
  }
}
