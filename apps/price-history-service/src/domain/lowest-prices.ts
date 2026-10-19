import type { LowestPriceItem } from '@lista/contracts';
import type { PriceHistoryPurchase, PriceHistoryPurchaseItem } from './purchase';

/** Candidato a menor preço de um grupo, com a compra de origem para o desempate. */
interface PriceCandidate {
  readonly item: PriceHistoryPurchaseItem;
  readonly purchaseDate: string;
  readonly createdAt: string;
}

function isBetterPrice(
  candidate: PriceCandidate,
  current: PriceCandidate,
): boolean {
  if (candidate.item.unitPrice !== current.item.unitPrice) {
    return candidate.item.unitPrice < current.item.unitPrice;
  }
  // Empate de preço: vale o item da compra mais recente. `purchaseDate`
  // (YYYY-MM-DD) e `createdAt` (ISO-8601) comparam como texto.
  if (candidate.purchaseDate !== current.purchaseDate) {
    return candidate.purchaseDate > current.purchaseDate;
  }
  return candidate.createdAt > current.createdAt;
}

/**
 * Menor preço por unidade de cada item distinto do histórico (RN-07a; AC-08,
 * AC-10): agrupa por `nameNormalized` (RN-06) e mantém o menor `unitPrice`, sem
 * média nem último preço. O nome de exibição é o do item que ostenta o menor
 * preço. Ordenação estável por `nameNormalized` para a lista não variar entre
 * requisições.
 */
export function aggregateLowestPrices(
  purchases: readonly PriceHistoryPurchase[],
): LowestPriceItem[] {
  const byName = new Map<string, PriceCandidate>();
  for (const purchase of purchases) {
    for (const item of purchase.items) {
      const candidate: PriceCandidate = {
        item,
        purchaseDate: purchase.purchaseDate,
        createdAt: purchase.createdAt,
      };
      const current = byName.get(item.nameNormalized);
      if (current === undefined || isBetterPrice(candidate, current)) {
        byName.set(item.nameNormalized, candidate);
      }
    }
  }
  return [...byName.values()]
    .map(({ item }) => ({
      name: item.name,
      nameNormalized: item.nameNormalized,
      lowestUnitPrice: item.unitPrice,
    }))
    .sort((left, right) =>
      left.nameNormalized < right.nameNormalized
        ? -1
        : left.nameNormalized > right.nameNormalized
          ? 1
          : 0,
    );
}
