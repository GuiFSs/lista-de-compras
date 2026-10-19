import type { PurchaseCompletedItem, PurchaseCompletedPayload } from '@lista/contracts';
import { isItemUnit } from './item-unit';

/**
 * Códigos de recusa da ingestão do evento v1. Seguem o padrão dos serviços
 * vizinhos: a borda (consumidor AMQP) traduz cada código; o domínio não
 * conhece broker nem status HTTP.
 */
export type IngestValidationError =
  | 'completion-id-invalid'
  | 'market-required'
  | 'purchase-date-required'
  | 'purchase-date-invalid'
  | 'items-empty'
  | 'item-name-required'
  | 'item-quantity-not-positive'
  | 'item-price-negative'
  | 'item-unit-invalid';

/** Payload vindo da borda; o domínio estreita cada campo antes de usá-lo. */
export interface IngestPayloadInput {
  completionId: unknown;
  market: unknown;
  purchaseDate: unknown;
  items: unknown;
}

export type IngestValidationResult =
  | { readonly ok: true; readonly payload: PurchaseCompletedPayload }
  | { readonly ok: false; readonly error: IngestValidationError };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// `completionId` é gerado com randomUUID no produtor; o consumidor só exige o
// formato UUID para descartar cedo payload corrompido (idempotência é T-06/T-07).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Round-trip no calendário rejeita dias/meses inexistentes (`2026-02-30`). */
function isCalendarDate(value: string): boolean {
  const parts = ISO_DATE.exec(value);
  if (parts === null) {
    return false;
  }
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validateItem(
  raw: unknown,
):
  | { readonly ok: true; readonly item: PurchaseCompletedItem }
  | { readonly ok: false; readonly error: IngestValidationError } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'item-name-required' };
  }
  const item = raw as Record<string, unknown>;
  const name = item['name'];
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { ok: false, error: 'item-name-required' };
  }
  const quantity = item['quantity'];
  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return { ok: false, error: 'item-quantity-not-positive' };
  }
  const unitPrice = item['unitPrice'];
  if (
    typeof unitPrice !== 'number' ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0
  ) {
    return { ok: false, error: 'item-price-negative' };
  }
  const unit = item['unit'];
  if (!isItemUnit(unit)) {
    return { ok: false, error: 'item-unit-invalid' };
  }
  return { ok: true, item: { name: name.trim(), quantity, unit, unitPrice } };
}

/**
 * Valida o payload do evento `PurchaseCompletedEventV1` na ingestão (RN-05):
 * `completionId` em formato UUID, mercado não vazio, data real `YYYY-MM-DD` e
 * ≥1 item com nome/quantidade/preço/unidade válidos (regras de item alinhadas
 * ao shopping-list). A checagem de data não futura ficou no produtor (RN-04) —
 * aqui a data já nasceu validada.
 */
export function validateIngestPayload(
  input: IngestPayloadInput,
): IngestValidationResult {
  const { completionId, market, purchaseDate, items } = input;
  if (typeof completionId !== 'string' || !UUID.test(completionId)) {
    return { ok: false, error: 'completion-id-invalid' };
  }
  if (typeof market !== 'string' || market.trim().length === 0) {
    return { ok: false, error: 'market-required' };
  }
  if (typeof purchaseDate !== 'string' || purchaseDate.length === 0) {
    return { ok: false, error: 'purchase-date-required' };
  }
  if (!isCalendarDate(purchaseDate)) {
    return { ok: false, error: 'purchase-date-invalid' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'items-empty' };
  }
  const validatedItems: PurchaseCompletedItem[] = [];
  for (const raw of items) {
    const result = validateItem(raw);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    validatedItems.push(result.item);
  }
  return {
    ok: true,
    payload: {
      completionId,
      market: market.trim(),
      purchaseDate,
      items: validatedItems,
    },
  };
}
