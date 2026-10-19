import { ItemUnit } from './shopping-list';

/** Entrada da lista de compras concluídas (mais recente primeiro). */
export interface PurchaseListItem {
  /** = completionId */
  id: string;
  market: string;
  /** YYYY-MM-DD */
  purchaseDate: string;
  itemCount: number;
  /** ISO-8601 */
  createdAt: string;
}

export interface PurchaseListResponse {
  purchases: PurchaseListItem[];
}

export interface PurchaseItem {
  name: string;
  quantity: number;
  unit: ItemUnit;
  /** Preço por unidade em R$ */
  unitPrice: number;
}

export interface PurchaseDetailResponse {
  id: string;
  market: string;
  /** YYYY-MM-DD */
  purchaseDate: string;
  items: PurchaseItem[];
  /** ISO-8601 */
  createdAt: string;
}

export interface LowestPriceItem {
  /** Nome de exibição (o do item que ostenta o menor preço). */
  name: string;
  nameNormalized: string;
  lowestUnitPrice: number;
}

export interface LowestPricesResponse {
  /** Ordenação estável por `nameNormalized` asc. */
  items: LowestPriceItem[];
}
