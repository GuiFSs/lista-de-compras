import { describe, expect, it } from 'vitest';
import type { LowestPriceByMarketResponse } from '@lista/contracts';
import { GetLowestPricesByItemUseCase } from './get-lowest-prices-by-item.use-case';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { makePurchase, uuid } from './testing/purchase-fixtures';

function repository(): InMemoryPurchaseRepository {
  return new InMemoryPurchaseRepository([
    makePurchase([{ name: 'Café', unitPrice: 12 }], {
      id: uuid(1),
      market: 'Atacadão',
      purchaseDate: '2026-09-01',
    }),
    makePurchase([{ name: 'CAFE', unitPrice: 9 }], {
      id: uuid(2),
      market: 'Zaffari',
      purchaseDate: '2026-09-10',
    }),
    makePurchase([{ name: 'Café', unitPrice: 6 }], {
      id: uuid(3),
      market: 'Zaffari',
      purchaseDate: '2026-10-01',
    }),
    makePurchase([{ name: 'Arroz', unitPrice: 8 }], {
      id: uuid(4),
      market: 'Atacadão',
      purchaseDate: '2026-10-01',
    }),
  ]);
}

const CAFE_RESPONSE: LowestPriceByMarketResponse = {
  name: 'Café',
  nameNormalized: 'cafe',
  markets: [
    {
      market: 'Atacadão',
      lowestUnitPrice: 12,
      purchaseDate: '2026-09-01',
      quantity: 1,
      unit: 'unidade',
    },
    {
      market: 'Zaffari',
      lowestUnitPrice: 6,
      purchaseDate: '2026-10-01',
      quantity: 1,
      unit: 'unidade',
    },
  ],
};

describe('GetLowestPricesByItemUseCase (RN-06/RN-09; AC-05…AC-08, AC-12)', () => {
  it('devolve uma linha por mercado com o menor preço daquele mercado (AC-06, AC-07)', async () => {
    const useCase = new GetLowestPricesByItemUseCase(repository());

    await expect(useCase.execute('cafe')).resolves.toEqual(CAFE_RESPONSE);
  });

  it('normaliza o parâmetro no caso de uso: Café, CAFÉ e " café " resolvem o mesmo item (R-1)', async () => {
    const useCase = new GetLowestPricesByItemUseCase(repository());

    const variants = await Promise.all([
      useCase.execute('Café'),
      useCase.execute('CAFÉ'),
      useCase.execute(' café '),
    ]);

    expect(variants).toEqual([CAFE_RESPONSE, CAFE_RESPONSE, CAFE_RESPONSE]);
  });

  it('devolve null só quando o item normalizado não tem histórico (AC-12)', async () => {
    const useCase = new GetLowestPricesByItemUseCase(repository());

    await expect(useCase.execute('Cerveja')).resolves.toBeNull();
    await expect(useCase.execute('Arroz')).resolves.not.toBeNull();
  });

  it('não muta o repositório (AC-06)', async () => {
    const repo = repository();
    const useCase = new GetLowestPricesByItemUseCase(repo);

    await useCase.execute('CAFÉ');

    expect(repo.count()).toBe(4);
    expect(repo.stored(uuid(2))?.items[0].name).toBe('CAFE');
  });
});
