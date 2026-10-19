import { PriceHistoryPurchase } from '../../domain/purchase';

/** Resumo de compra para a listagem do Histórico (RN-08), sem os itens. */
export interface PurchaseSummary {
  /** = `completionId` — identifica a compra (RN-11). */
  id: string;
  market: string;
  /** YYYY-MM-DD. */
  purchaseDate: string;
  itemCount: number;
  /** ISO-8601. */
  createdAt: string;
}

/**
 * Port da persistência do histórico (banco `price_history`, dono exclusivo
 * deste serviço — RN-01/ADR 0001). Classe abstrata pura (sem framework):
 * contrato dos casos de uso e token de injeção, como nos serviços vizinhos.
 */
export abstract class PurchaseRepository {
  /**
   * Persiste a compra e os itens em uma única transação. `false` quando o
   * `completionId` já existe: reentrega do evento não duplica registro
   * (idempotência RN-11 / AC-16).
   */
  abstract insert(purchase: PriceHistoryPurchase): Promise<boolean>;

  /** Listagem do Histórico: `purchaseDate` desc, empate por `createdAt` desc (RN-08). */
  abstract listSummaries(): Promise<PurchaseSummary[]>;

  /** Detalhe com itens; `null` quando o id não existe (a borda responde 404). */
  abstract findById(id: string): Promise<PriceHistoryPurchase | null>;

  /** Compras com itens — insumo de `aggregateLowestPrices` (menor preço/busca). */
  abstract findAllWithItems(): Promise<PriceHistoryPurchase[]>;
}
