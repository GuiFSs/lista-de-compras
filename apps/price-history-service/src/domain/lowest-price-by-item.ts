import type {
  LowestPriceByMarketLine,
  LowestPriceByMarketResponse,
} from '@lista/contracts';
import type { PriceHistoryPurchase } from './purchase';
import { isBetterPrice, type PriceCandidate } from './lowest-prices';
import { compareMarketNames } from './market-order';

/**
 * Menor preço de um item em cada mercado (RN-06; AC-06, AC-07, AC-08): aplica a
 * mesma cadeia de vencedor da lista principal dentro de cada mercado e devolve
 * uma linha por mercado, em A→Z. `name` é o do vencedor global (CD-07); quando o
 * item não tem histórico, `markets` fica vazio e `name` vazio — a ausência vira
 * 404 na borda (RN-08), não `null` no domínio.
 */
export function aggregateLowestPricesByItem(
  purchases: readonly PriceHistoryPurchase[],
  nameNormalized: string,
): LowestPriceByMarketResponse {
  const winnerByMarket = new Map<string, PriceCandidate>();
  let globalWinner: PriceCandidate | undefined;

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      if (item.nameNormalized !== nameNormalized) {
        continue;
      }
      const candidate: PriceCandidate = {
        item,
        purchaseId: purchase.id,
        market: purchase.market,
        purchaseDate: purchase.purchaseDate,
      };
      const current = winnerByMarket.get(purchase.market);
      if (current === undefined || isBetterPrice(candidate, current)) {
        winnerByMarket.set(purchase.market, candidate);
      }
      if (
        globalWinner === undefined ||
        isBetterPrice(candidate, globalWinner)
      ) {
        globalWinner = candidate;
      }
    }
  }

  const markets: LowestPriceByMarketLine[] = [...winnerByMarket.entries()]
    .sort(([left], [right]) => compareMarketNames(left, right))
    .map(([market, { item, purchaseDate }]) => ({
      market,
      lowestUnitPrice: item.unitPrice,
      purchaseDate,
      quantity: item.quantity,
      unit: item.unit,
    }));

  return {
    name: globalWinner?.item.name ?? '',
    nameNormalized,
    markets,
  };
}
