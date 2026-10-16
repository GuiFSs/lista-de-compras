import type { ItemUnit } from '@lista/contracts';
import { createPriceHistoryPurchase } from '../../../domain/purchase';
import type { PriceHistoryPurchase } from '../../../domain/purchase';

export interface PurchaseFixtureItem {
  name: string;
  unitPrice: number;
  quantity?: number;
  unit?: ItemUnit;
}

export interface PurchaseFixtureOptions {
  id: string;
  purchaseDate: string;
  market?: string;
  createdAt?: string;
}

/**
 * Monta a compra pelo mesmo caminho da ingestão (`createPriceHistoryPurchase`),
 * para o fixture já carregar `nameNormalized` (RN-06) sem duplicar a regra.
 */
export function makePurchase(
  items: readonly PurchaseFixtureItem[],
  options: PurchaseFixtureOptions,
): PriceHistoryPurchase {
  return createPriceHistoryPurchase({
    payload: {
      completionId: options.id,
      market: options.market ?? 'Mercado Central',
      purchaseDate: options.purchaseDate,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'unidade',
        unitPrice: item.unitPrice,
      })),
    },
    createdAt: options.createdAt ?? `${options.purchaseDate}T12:00:00.000Z`,
  });
}

/** UUID válido para os casos que exigem o formato (`completionId` na ingestão). */
export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}
