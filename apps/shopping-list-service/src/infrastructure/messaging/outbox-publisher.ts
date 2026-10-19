import type { EventPublisher } from '../../application/ports/event-publisher.port';
import type { OutboxRepository } from '../../application/ports/outbox-repository.port';

/** Log do publisher (o serviço passa o `Logger` do Nest por trás desta porta). */
export interface OutboxPublisherLogger {
  error(message: string, error: unknown): void;
}

export interface OutboxPublisherOptions {
  /** Mensagens por ciclo — evita segurar um lote grande de uma vez. */
  batchSize?: number;
  /** Intervalo entre ciclos, em ms. */
  intervalMs?: number;
  logger?: OutboxPublisherLogger;
}

export interface OutboxPublishFailure {
  readonly id: string;
  readonly error: unknown;
}

export interface OutboxPublishReport {
  readonly published: number;
  readonly failed: readonly OutboxPublishFailure[];
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_INTERVAL_MS = 5_000;

const NOOP_LOGGER: OutboxPublisherLogger = { error: () => undefined };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Publisher do outbox: cada ciclo publica os pendentes mais antigos e marca
 * `publishedAt` no sucesso; a falha vira `attempts`/`lastError` e a mensagem
 * continua pendente para o próximo ciclo (retry até publicar, CD-06). Um item
 * que falha não bloqueia os seguintes — a ordem é best-effort e a entrega não.
 *
 * `findPending`/`markPublished`/`recordFailure` são do port; o broker só entra
 * por `EventPublisher`, então este ciclo é testável com doubles.
 */
export class OutboxPublisher {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly publisher: EventPublisher,
    private readonly options: OutboxPublisherOptions = {},
  ) {}

  /** Um ciclo completo: publica o lote pendente e reporta sucessos/falhas. */
  async runOnce(now: Date = new Date()): Promise<OutboxPublishReport> {
    const pending = await this.outbox.findPending(
      this.options.batchSize ?? DEFAULT_BATCH_SIZE,
    );
    const failed: OutboxPublishFailure[] = [];
    let published = 0;

    for (const message of pending) {
      try {
        await this.publisher.publish(message.envelope);
        await this.outbox.markPublished(message.id, now);
        published += 1;
      } catch (error) {
        await this.outbox.recordFailure(message.id, errorMessage(error));
        failed.push({ id: message.id, error });
      }
    }
    return { published, failed };
  }

  /**
   * Inicia o ciclo periódico. O intervalo é `unref`ted (não segura o processo)
   * e ciclos sobrepostos são ignorados: o próximo começa quando o atual termina.
   */
  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.intervalMs ?? DEFAULT_INTERVAL_MS);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer === null) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.runOnce();
    } catch (error) {
      // Banco fora não pode derrubar o processo; o próximo ciclo tenta de novo.
      this.logger().error('Ciclo do outbox falhou', error);
    } finally {
      this.running = false;
    }
  }

  private logger(): OutboxPublisherLogger {
    return this.options.logger ?? NOOP_LOGGER;
  }
}
