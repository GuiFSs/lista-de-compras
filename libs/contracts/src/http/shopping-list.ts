import { ApiErrorResponse } from './auth';

/**
 * Unidades aceitas (RN-05). Declaradas uma única vez aqui: serviço e PWA
 * compartilham a lista para não divergirem em duas strings.
 */
export const ITEM_UNITS = ['unidade', 'kg', 'g', 'L', 'ml', 'pacote', 'caixa'] as const;

export type ItemUnit = (typeof ITEM_UNITS)[number];

/** Dados da compra; presente no item ⇒ comprado. O item segue na lista ativa. */
export interface PurchasedDetails {
  /** > 0 */
  quantity: number;
  unit: ItemUnit;
  /** >= 0, em R$ */
  unitPrice: number;
  /** ISO-8601 */
  purchasedAt: string;
}

export interface ShoppingListItem {
  id: string;
  /** Como digitado (apenas trim aplicado). */
  name: string;
  plannedQuantity: number | null;
  unit: ItemUnit | null;
  plannedPrice: number | null;
  purchased: PurchasedDetails | null;
  createdAt: string;
  updatedAt: string;
}

/** Lista ativa completa, pendentes primeiro. */
export interface ShoppingListResponse {
  items: ShoppingListItem[];
}

/** Resolução de duplicidade — só na criação (CD-02). */
export type DuplicateResolution = 'reject' | 'sum-planned-quantity';

export interface CreateShoppingListItemRequest {
  name: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  /** Default `'reject'`; `'sum-planned-quantity'` soma ao item existente. */
  duplicateResolution?: DuplicateResolution;
}

export interface UpdateShoppingListItemRequest {
  /** Ausente = mantém. */
  name?: string;
  /** Ausente = mantém; `null` = limpa. */
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  // Sem `duplicateResolution`: na edição o 409 é terminal (CD-13) — nada é somado.
}

export interface MarkItemPurchasedRequest {
  purchasedQuantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

/**
 * Corpo do checkout quando há ≥1 item comprado.
 * Com 0 comprados o corpo pode ser omitido ou `{}` (sem mercado/data).
 */
export interface CheckoutShoppingListRequest {
  /** Trim; rejeitar vazio/só espaços. */
  market: string;
  /** YYYY-MM-DD; ≤ hoje (calendário). */
  purchaseDate: string;
}

/** Limite de upload da foto da nota (RN-03 / PLAN receipt-purchase). */
export const RECEIPT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export const RECEIPT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ReceiptImageMimeType = (typeof RECEIPT_IMAGE_MIME_TYPES)[number];

/** Linha devolvida pelo recognize — campos podem faltar para revisão humana. */
export interface RecognizedReceiptLine {
  name: string | null;
  quantity: number | null;
  unit: ItemUnit | null;
  unitPrice: number | null;
}

export interface RecognizeReceiptResponse {
  market: string | null;
  /** YYYY-MM-DD quando legível; senão null. */
  purchaseDate: string | null;
  lines: RecognizedReceiptLine[];
}

/** Linha enviada no apply; só `include: true` com campos válidos entram. */
export interface ApplyReceiptLineRequest {
  name: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;
  include: boolean;
}

export interface ApplyReceiptPurchaseRequest {
  market?: string | null;
  purchaseDate?: string | null;
  lines: ApplyReceiptLineRequest[];
}

/**
 * 409 de duplicidade. Usado na criação (fluxo: a PWA pergunta "somar?" e
 * reenvia com `duplicateResolution`) e na edição (conflito terminal no
 * formulário, sem soma — CD-13).
 */
export interface DuplicateItemErrorResponse extends ApiErrorResponse {
  error: 'duplicate-item-name';
  duplicateOf: { id: string; name: string };
}
