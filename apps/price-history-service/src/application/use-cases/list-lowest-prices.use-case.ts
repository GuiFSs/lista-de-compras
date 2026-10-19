import type { LowestPricesResponse } from '@lista/contracts';
import { filterLowestPrices } from '../../domain/lowest-price-search';
import { aggregateLowestPrices } from '../../domain/lowest-prices';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

/**
 * Menores preços do histórico (RN-06/RN-07; AC-08…AC-10, AC-12). Agrega o
 * histórico por nome normalizado e, com `q` não vazia, filtra por substring sob
 * a mesma normalização — `cafe` encontra `café`. Sem `q` (ou só espaços) a lista
 * vem completa.
 */
export class ListLowestPricesUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(q?: string): Promise<LowestPricesResponse> {
    const purchases = await this.repository.findAllWithItems();
    return {
      items: filterLowestPrices(aggregateLowestPrices(purchases), q ?? ''),
    };
  }
}
