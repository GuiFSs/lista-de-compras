import type { LowestPriceByMarketResponse } from '@lista/contracts';
import { normalizeItemName } from '../../domain/item-name';
import { aggregateLowestPricesByItem } from '../../domain/lowest-price-by-item';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

/**
 * Menor preço de um item por mercado (RN-06/RN-09; AC-05…AC-08, AC-12). O
 * parâmetro chega cru da borda e é normalizado aqui, com a mesma regra da
 * busca (R-1): `Café`, `CAFÉ` e ` café ` consultam o mesmo item. Devolve
 * `null` quando o item normalizado não tem histórico — a borda traduz para
 * 404. Agrupamento, ordenação e desempate vêm prontos do domínio.
 */
export class GetLowestPricesByItemUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(
    itemParam: string,
  ): Promise<LowestPriceByMarketResponse | null> {
    const nameNormalized = normalizeItemName(itemParam);
    const purchases =
      await this.repository.findAllWithItemsByName(nameNormalized);
    const response = aggregateLowestPricesByItem(purchases, nameNormalized);
    return response.markets.length === 0 ? null : response;
  }
}
