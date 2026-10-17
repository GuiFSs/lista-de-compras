import {
  PURCHASE_COMPLETED_EVENT_TYPE,
  PURCHASE_COMPLETED_EVENT_VERSION,
} from '@lista/contracts';
import type { IngestPurchaseUseCase } from '../../application';
import type {
  IngestPayloadInput,
  IngestValidationError,
} from '../../domain/ingest-validation';

/**
 * Motivos de recusa. `invalid-*` e os códigos do domínio são permanentes
 * (reprocessar os mesmos bytes nunca os faria passar); `ingest-failed` e
 * `handler-failed` são transitórios e voltam para a fila.
 */
export type ConsumeRejectionReason =
  | IngestValidationError
  | 'invalid-json'
  | 'invalid-envelope'
  | 'ingest-failed'
  | 'handler-failed';

export type ConsumeDecision =
  | {
      readonly action: 'ack';
      /** = `completionId` da mensagem ingerida. */
      readonly id: string;
      readonly created: boolean;
    }
  | {
      readonly action: 'nack';
      readonly requeue: boolean;
      readonly reason: ConsumeRejectionReason;
      readonly error?: unknown;
    };

type EnvelopeParse =
  | { readonly ok: true; readonly payload: IngestPayloadInput }
  | { readonly ok: false; readonly reason: 'invalid-json' | 'invalid-envelope' };

function parseEnvelope(raw: string): EnvelopeParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'invalid-envelope' };
  }
  const envelope = parsed as Record<string, unknown>;
  if (
    envelope['eventType'] !== PURCHASE_COMPLETED_EVENT_TYPE ||
    envelope['eventVersion'] !== PURCHASE_COMPLETED_EVENT_VERSION
  ) {
    return { ok: false, reason: 'invalid-envelope' };
  }
  const payload = envelope['payload'];
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, reason: 'invalid-envelope' };
  }
  // Os campos do payload são `unknown` de propósito: quem estreita cada um é o
  // domínio, via IngestPurchaseUseCase.
  return { ok: true, payload: payload as IngestPayloadInput };
}

/**
 * Porta do consumidor: transforma um corpo bruto de mensagem na decisão de
 * ack/nack — o adapter AMQP não enxerga caso de uso nem domínio.
 */
export interface MessageHandling {
  handle(raw: string): Promise<ConsumeDecision>;
}

/**
 * Deserializa o corpo da mensagem no `IngestPurchaseUseCase` e devolve a
 * decisão de ack/nack. Payload inválido nunca vai para requeue: DLQ está fora
 * da v1 (PLAN), então descartar sem requeue — com log no chamador — é o que
 * evita reprocessamento infinito de bytes corrompidos.
 */
export class PurchaseCompletedHandler implements MessageHandling {
  constructor(private readonly ingest: IngestPurchaseUseCase) {}

  async handle(raw: string): Promise<ConsumeDecision> {
    const envelope = parseEnvelope(raw);
    if (!envelope.ok) {
      return { action: 'nack', requeue: false, reason: envelope.reason };
    }
    try {
      const result = await this.ingest.execute(envelope.payload);
      if (!result.ok) {
        return { action: 'nack', requeue: false, reason: result.error };
      }
      return { action: 'ack', id: result.id, created: result.created };
    } catch (error) {
      // Banco indisponível é transitória: requeue e a idempotência por
      // completionId cobre a reentrega.
      return { action: 'nack', requeue: true, reason: 'ingest-failed', error };
    }
  }
}
