import type {
  IngestPayloadInput,
  IngestValidationError,
} from '../../domain/ingest-validation';
import { validateIngestPayload } from '../../domain/ingest-validation';
import { createPriceHistoryPurchase } from '../../domain/purchase';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

/**
 * Ingestão do evento `PurchaseCompletedEventV1` (RN-02/RN-05/RN-11).
 * `created` separa a primeira entrega (`true`) da reentrega idempotente
 * (`false`) — nos dois casos a ingestão é bem-sucedida e o consumidor pode dar
 * ack (T-09); só a validação recusa o payload.
 */
export type IngestPurchaseResult =
  | {
      readonly ok: true;
      /** = `completionId` do evento. */
      readonly id: string;
      readonly created: boolean;
    }
  | { readonly ok: false; readonly error: IngestValidationError };

/**
 * Caso de uso do consumidor AMQP (T-09), não da borda HTTP. Falha do
 * repositório propaga: a indisponibilidade do banco é transitória e cabe à
 * borda decidir nack/requeue (PLAN T-09).
 */
export class IngestPurchaseUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(payload: IngestPayloadInput): Promise<IngestPurchaseResult> {
    const validation = validateIngestPayload(payload);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    // `createdAt` é o momento do consumo, não o `occurredAt` do checkout: a
    // ordenação de empate do Histórico usa a ordem de registro (RN-08).
    const purchase = createPriceHistoryPurchase({
      payload: validation.payload,
      createdAt: new Date().toISOString(),
    });
    const created = await this.repository.insert(purchase);
    return { ok: true, id: purchase.id, created };
  }
}
