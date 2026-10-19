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

/**
 * 409 de duplicidade. Usado na criação (fluxo: a PWA pergunta "somar?" e
 * reenvia com `duplicateResolution`) e na edição (conflito terminal no
 * formulário, sem soma — CD-13).
 */
export interface DuplicateItemErrorResponse extends ApiErrorResponse {
  error: 'duplicate-item-name';
  duplicateOf: { id: string; name: string };
}
