import { isItemUnit } from './item-unit';
import { normalizeItemName } from './item-name';
import type {
  PriceHistoryPurchase,
  PriceHistoryPurchaseItem,
} from './purchase';

/**
 * Recusas da edição de uma compra já concluída. A borda HTTP traduz cada
 * código; o domínio não conhece status.
 */
export type UpdatePurchaseError =
  | 'market-required'
  | 'purchase-date-required'
  | 'purchase-date-invalid'
  | 'purchase-date-future'
  | 'items-empty'
  | 'item-name-required'
  | 'item-quantity-not-positive'
  | 'item-price-negative'
  | 'item-unit-invalid'
  | 'duplicate-item-name';

/** Corpo cru do PATCH. O domínio estreita cada campo antes de gravar. */
export interface UpdatePurchaseCommand {
  market: unknown;
  purchaseDate: unknown;
  items: unknown;
}

export type ParsedPurchaseUpdate = {
  readonly market: string;
  readonly purchaseDate: string;
  readonly items: readonly PriceHistoryPurchaseItem[];
};

export type ParsePurchaseUpdateResult =
  | { readonly ok: true; readonly update: ParsedPurchaseUpdate }
  | { readonly ok: false; readonly error: UpdatePurchaseError };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Hoje em calendário UTC. A PWA já limita o input ao dia local. */
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

function validateLine(
  raw: unknown,
):
  | { readonly ok: true; readonly item: PriceHistoryPurchaseItem }
  | { readonly ok: false; readonly error: UpdatePurchaseError } {
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
  const trimmed = name.trim();
  return {
    ok: true,
    item: {
      name: trimmed,
      nameNormalized: normalizeItemName(trimmed),
      quantity,
      unit,
      unitPrice,
    },
  };
}

/**
 * Valida o corpo da edição sem olhar o registro atual: mercado, data não
 * futura, ao menos uma linha e nomes únicos na compra depois da normalização.
 * `id` e `createdAt` ficam de fora de propósito — quem aplica é o caso de uso,
 * a partir da compra que já existe.
 */
export function parsePurchaseUpdate(
  command: UpdatePurchaseCommand,
  now: Date,
): ParsePurchaseUpdateResult {
  if (typeof command.market !== 'string' || command.market.trim().length === 0) {
    return { ok: false, error: 'market-required' };
  }
  if (
    command.purchaseDate === undefined ||
    command.purchaseDate === null ||
    command.purchaseDate === ''
  ) {
    return { ok: false, error: 'purchase-date-required' };
  }
  if (
    typeof command.purchaseDate !== 'string' ||
    !isCalendarDate(command.purchaseDate)
  ) {
    return { ok: false, error: 'purchase-date-invalid' };
  }
  if (command.purchaseDate > utcCalendarDate(now)) {
    return { ok: false, error: 'purchase-date-future' };
  }
  if (!Array.isArray(command.items) || command.items.length === 0) {
    return { ok: false, error: 'items-empty' };
  }

  const items: PriceHistoryPurchaseItem[] = [];
  const seen = new Set<string>();
  for (const raw of command.items) {
    const line = validateLine(raw);
    if (!line.ok) {
      return line;
    }
    if (seen.has(line.item.nameNormalized)) {
      return { ok: false, error: 'duplicate-item-name' };
    }
    seen.add(line.item.nameNormalized);
    items.push(line.item);
  }

  return {
    ok: true,
    update: {
      market: command.market.trim(),
      purchaseDate: command.purchaseDate,
      items,
    },
  };
}

/** Monta a compra editada preservando a identidade e o instante de criação. */
export function purchaseFromUpdate(
  current: PriceHistoryPurchase,
  update: ParsedPurchaseUpdate,
): PriceHistoryPurchase {
  return {
    id: current.id,
    createdAt: current.createdAt,
    market: update.market,
    purchaseDate: update.purchaseDate,
    items: [...update.items],
  };
}
