import type { LowestPriceItem, LowestPriceMarketGroup } from '@lista/contracts';
import type {
  PriceHistoryPurchase,
  PriceHistoryPurchaseItem,
} from './purchase';
import { compareMarketNames } from './market-order';

/** Candidato a menor preço de um grupo, com a compra de origem para o desempate. */
interface PriceCandidate {
  readonly item: PriceHistoryPurchaseItem;
  readonly purchaseId: string;
  readonly market: string;
  readonly purchaseDate: string;
}

function isBetterPrice(
  candidate: PriceCandidate,
  current: PriceCandidate,
): boolean {
  if (candidate.item.unitPrice !== current.item.unitPrice) {
    return candidate.item.unitPrice < current.item.unitPrice;
  }
  // Empate de preço: vale a compra mais recente. `purchaseDate` é YYYY-MM-DD,
  // então a comparação lexicográfica é cronológica.
  if (candidate.purchaseDate !== current.purchaseDate) {
    return candidate.purchaseDate > current.purchaseDate;
  }
  // Desempate final determinístico (RN-04/CD-03): vence o menor id, qualquer
  // que seja a ordem de chegada das compras. `createdAt` não participa.
  return candidate.purchaseId < current.purchaseId;
}

function compareByNameNormalized(
  left: LowestPriceItem,
  right: LowestPriceItem,
): number {
  if (left.nameNormalized === right.nameNormalized) {
    return 0;
  }
  return left.nameNormalized < right.nameNormalized ? -1 : 1;
}

/**
 * Menor preço por unidade de cada item distinto do histórico (RN-02; AC-01,
 * AC-03, AC-04): agrupa por `nameNormalized` e mantém o menor `unitPrice`, sem
 * média nem último preço. A linha herda mercado, data, quantidade e unidade da
 * compra vencedora. Ordenação estável por `nameNormalized`.
 */
export function aggregateLowestPrices(
  purchases: readonly PriceHistoryPurchase[],
): LowestPriceItem[] {
  const byName = new Map<string, PriceCandidate>();
  for (const purchase of purchases) {
    for (const item of purchase.items) {
      const candidate: PriceCandidate = {
        item,
        purchaseId: purchase.id,
        market: purchase.market,
        purchaseDate: purchase.purchaseDate,
      };
      const current = byName.get(item.nameNormalized);
      if (current === undefined || isBetterPrice(candidate, current)) {
        byName.set(item.nameNormalized, candidate);
      }
    }
  }
  return [...byName.values()]
    .map(({ item, market, purchaseDate }) => ({
      name: item.name,
      nameNormalized: item.nameNormalized,
      lowestUnitPrice: item.unitPrice,
      market,
      purchaseDate,
      quantity: item.quantity,
      unit: item.unit,
    }))
    .sort(compareByNameNormalized);
}

/**
 * Agrupa a lista principal pelo mercado da compra vencedora (RN-05/CD-04,
 * CD-09): mercados A→Z, itens A→Z por `nameNormalized` e nenhum grupo vazio —
 * os grupos nascem dos itens. A chave é o texto cru do mercado, então
 * `group.market` é exatamente o `market` de cada linha (R-6b); variações de
 * caixa formam grupos distintos, ordenados pelo texto cru.
 */
export function groupByMarket(
  items: readonly LowestPriceItem[],
): LowestPriceMarketGroup[] {
  const itemsByMarket = new Map<string, LowestPriceItem[]>();
  for (const item of items) {
    const group = itemsByMarket.get(item.market);
    if (group === undefined) {
      itemsByMarket.set(item.market, [item]);
    } else {
      group.push(item);
    }
  }
  return [...itemsByMarket.entries()]
    .sort(([left], [right]) => compareMarketNames(left, right))
    .map(([market, groupItems]) => ({
      market,
      items: [...groupItems].sort(compareByNameNormalized),
    }));
}
