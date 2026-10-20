import type { ItemUnit } from './shopping-list';

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

/** Menor preço por unidade de um item, com os dados da compra vencedora. */
export interface LowestPriceItem {
  /** Nome de exibição (o do item que ostenta o menor preço). */
  name: string;
  /** Chave de agrupamento e busca; também o parâmetro `{item}` do drill-down
   * (percent-encoded com `encodeURIComponent`). */
  nameNormalized: string;
  /** Menor preço POR UNIDADE em R$ — nunca o total da compra. */
  lowestUnitPrice: number;
  /** Mercado da compra vencedora. */
  market: string;
  /** Data da compra vencedora, `YYYY-MM-DD`. */
  purchaseDate: string;
  /** Quantidade da compra vencedora, com a unidade em `unit`. */
  quantity: number;
  unit: ItemUnit;
}

/** Grupo de mercado da lista principal; nunca vazio. */
export interface LowestPriceMarketGroup {
  market: string;
  /** Itens em A→Z por `nameNormalized`; `market` é o mesmo de todas as linhas. */
  items: LowestPriceItem[];
}

/** Lista principal: agrupamento e ordenação chegam prontos do serviço. */
export interface LowestPricesResponse {
  /** Mercados em A→Z; só grupos com ao menos um item. */
  markets: LowestPriceMarketGroup[];
}

/** Uma linha por mercado do drill-down de um item. */
export interface LowestPriceByMarketLine {
  market: string;
  /** Menor preço POR UNIDADE daquele item naquele mercado, em R$. */
  lowestUnitPrice: number;
  /** Data da compra vencedora naquele mercado, `YYYY-MM-DD`. */
  purchaseDate: string;
  /** Quantidade da compra vencedora naquele mercado, com a unidade em `unit`. */
  quantity: number;
  unit: ItemUnit;
}

/** Drill-down `/menor-preco/:item`, já agregado e ordenado pelo serviço. */
export interface LowestPriceByMarketResponse {
  /** Nome de exibição canônico (o do item vencedor entre os mercados). */
  name: string;
  nameNormalized: string;
  /** Mercados em A→Z. */
  markets: LowestPriceByMarketLine[];
}
