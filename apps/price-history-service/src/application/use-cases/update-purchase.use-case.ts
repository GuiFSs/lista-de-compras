import type { PurchaseDetailResponse, PurchaseItem } from '@lista/contracts';
import type { PriceHistoryPurchaseItem } from '../../domain/purchase';
import {
  parsePurchaseUpdate,
  purchaseFromUpdate,
  type UpdatePurchaseCommand,
  type UpdatePurchaseError,
} from '../../domain/update-purchase';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

export type UpdatePurchaseFailure = 'not-found' | UpdatePurchaseError;

export type UpdatePurchaseResult =
  | { readonly ok: true; readonly purchase: PurchaseDetailResponse }
  | { readonly ok: false; readonly error: UpdatePurchaseFailure };

function toPurchaseItem(item: PriceHistoryPurchaseItem): PurchaseItem {
  return {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
  };
}

/**
 * Corrige uma compra já concluída. A validação não depende do banco; a
 * ausência do id só é 404 depois de o corpo ser aceito, para um payload
 * inválido não se disfarçar de compra inexistente.
 */
export class UpdatePurchaseUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(
    id: string,
    command: UpdatePurchaseCommand,
    now: Date,
  ): Promise<UpdatePurchaseResult> {
    const parsed = parsePurchaseUpdate(command, now);
    if (!parsed.ok) {
      return parsed;
    }
    const current = await this.repository.findById(id);
    if (current === null) {
      return { ok: false, error: 'not-found' };
    }
    const next = purchaseFromUpdate(current, parsed.update);
    const saved = await this.repository.update(next);
    if (!saved) {
      return { ok: false, error: 'not-found' };
    }
    return {
      ok: true,
      purchase: {
        id: next.id,
        market: next.market,
        purchaseDate: next.purchaseDate,
        createdAt: next.createdAt,
        items: next.items.map(toPurchaseItem),
      },
    };
  }
}
