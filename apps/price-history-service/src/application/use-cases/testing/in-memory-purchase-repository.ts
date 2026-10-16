import type { PriceHistoryPurchase } from '../../../domain/purchase';
import type { PurchaseSummary } from '../../ports/purchase-repository.port';
import { PurchaseRepository } from '../../ports/purchase-repository.port';

function compareDesc(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? 1 : -1;
}

/**
 * Repositório em memória para os specs de caso de uso: imita o contrato do
 * adaptador Drizzle (idempotência por id, ordenação da listagem por
 * `purchaseDate` desc com empate por `createdAt` desc) sem banco.
 */
export class InMemoryPurchaseRepository extends PurchaseRepository {
  private readonly purchases = new Map<string, PriceHistoryPurchase>();

  constructor(seed: readonly PriceHistoryPurchase[] = []) {
    super();
    for (const purchase of seed) {
      this.purchases.set(purchase.id, purchase);
    }
  }

  async insert(purchase: PriceHistoryPurchase): Promise<boolean> {
    if (this.purchases.has(purchase.id)) {
      return false;
    }
    this.purchases.set(purchase.id, purchase);
    return true;
  }

  async listSummaries(): Promise<PurchaseSummary[]> {
    return [...this.purchases.values()]
      .map((purchase) => ({
        id: purchase.id,
        market: purchase.market,
        purchaseDate: purchase.purchaseDate,
        itemCount: purchase.items.length,
        createdAt: purchase.createdAt,
      }))
      .sort(
        (left, right) =>
          compareDesc(left.purchaseDate, right.purchaseDate) ||
          compareDesc(left.createdAt, right.createdAt),
      );
  }

  async findById(id: string): Promise<PriceHistoryPurchase | null> {
    return this.purchases.get(id) ?? null;
  }

  async findAllWithItems(): Promise<PriceHistoryPurchase[]> {
    return [...this.purchases.values()].sort(
      (left, right) =>
        compareDesc(left.purchaseDate, right.purchaseDate) ||
        compareDesc(left.createdAt, right.createdAt),
    );
  }

  /** Leitura direta para asserções. */
  stored(id: string): PriceHistoryPurchase | null {
    return this.purchases.get(id) ?? null;
  }

  count(): number {
    return this.purchases.size;
  }
}
