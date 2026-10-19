/**
 * Códigos de validação do checkout. Seguem o padrão de `ItemValidationError`:
 * a borda HTTP traduz cada código na mensagem PT do contrato; o domínio não
 * conhece status HTTP.
 */
export type CheckoutValidationError =
  | 'market-required'
  | 'purchase-date-required'
  | 'purchase-date-invalid'
  | 'purchase-date-future';

/** Corpo do checkout cru da borda; o domínio estreita cada campo antes de usá-lo. */
export interface CheckoutInput {
  market: unknown;
  purchaseDate: unknown;
}

export type CheckoutValidationResult =
  | { readonly ok: true; readonly market: string; readonly purchaseDate: string }
  | { readonly ok: false; readonly error: CheckoutValidationError };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Hoje em calendário UTC (`YYYY-MM-DD`). O servidor compara a data pedida
 * contra esta data como defesa (CD-07) — a PWA já restringiu o input ao
 * calendário local.
 */
function utcCalendarDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

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

/**
 * Valida mercado e data de um checkout com ≥1 comprado (RN-03/RN-04 da spec
 * price-history): mercado trim não vazio, data `YYYY-MM-DD` real e não futura
 * (CD-07 — passado é livre). A ordem dos códigos segue a ordem dos campos do
 * contrato; com 0 comprados quem chama nem valida (RN-09).
 */
export function validateCheckoutInput(
  input: CheckoutInput,
  now: Date,
): CheckoutValidationResult {
  if (typeof input.market !== 'string' || input.market.trim().length === 0) {
    return { ok: false, error: 'market-required' };
  }
  if (
    input.purchaseDate === undefined ||
    input.purchaseDate === null ||
    input.purchaseDate === ''
  ) {
    return { ok: false, error: 'purchase-date-required' };
  }
  if (
    typeof input.purchaseDate !== 'string' ||
    !isCalendarDate(input.purchaseDate)
  ) {
    return { ok: false, error: 'purchase-date-invalid' };
  }
  if (input.purchaseDate > utcCalendarDate(now)) {
    return { ok: false, error: 'purchase-date-future' };
  }
  return {
    ok: true,
    market: input.market.trim(),
    purchaseDate: input.purchaseDate,
  };
}
