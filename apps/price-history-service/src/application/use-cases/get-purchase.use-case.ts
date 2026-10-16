import type { PurchaseDetailResponse, PurchaseItem } from '@lista/contracts';
import type { PriceHistoryPurchaseItem } from '../../domain/purchase';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

/** Item do detalhe no shape do contrato: `nameNormalized` é interno do domínio. */
function toPurchaseItem(item: PriceHistoryPurchaseItem): PurchaseItem {
  return {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
  };
}

/**
 * Detalhe de uma compra do Histórico (RN-08; AC-11). Devolve `null` quando o id
 * não existe; a borda HTTP (T-08) traduz `null` para 404.
 */
export class GetPurchaseUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(id: string): Promise<PurchaseDetailResponse | null> {
    const purchase = await this.repository.findById(id);
    if (purchase === null) {
      return null;
    }
    return {
      id: purchase.id,
      market: purchase.market,
      purchaseDate: purchase.purchaseDate,
      createdAt: purchase.createdAt,
      items: purchase.items.map(toPurchaseItem),
    };
  }
}
