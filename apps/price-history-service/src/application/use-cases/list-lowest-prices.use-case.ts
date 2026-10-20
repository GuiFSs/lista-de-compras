import type { LowestPricesResponse } from '@lista/contracts';
import { filterLowestPrices } from '../../domain/lowest-price-search';
import {
  aggregateLowestPrices,
  groupByMarket,
} from '../../domain/lowest-prices';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

/**
 * Menores preços do histórico agrupados por mercado (RN-05/RN-07; AC-01,
 * AC-02, AC-09). Agrega por `nameNormalized`, filtra por `q` sob a mesma
 * normalização e só então agrupa: filtrar não pode desfazer o agrupamento
 * (mercado sem item filtrado simplesmente deixa de existir). Sem `q` (ou só
 * espaços) a lista vem completa; busca sem resultado devolve `markets: []`.
 */
export class ListLowestPricesUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(q?: string): Promise<LowestPricesResponse> {
    const purchases = await this.repository.findAllWithItems();
    const items = filterLowestPrices(aggregateLowestPrices(purchases), q ?? '');
    return { markets: groupByMarket(items) };
  }
}
