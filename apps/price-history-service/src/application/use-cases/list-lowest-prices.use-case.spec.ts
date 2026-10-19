import { describe, expect, it } from 'vitest';
import { ListLowestPricesUseCase } from './list-lowest-prices.use-case';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { makePurchase, uuid } from './testing/purchase-fixtures';

function repository(): InMemoryPurchaseRepository {
  return new InMemoryPurchaseRepository([
    makePurchase([{ name: 'café', unitPrice: 12 }], {
      id: uuid(1),
      purchaseDate: '2026-09-01',
    }),
    makePurchase([{ name: 'CAFE', unitPrice: 7.5 }], {
      id: uuid(2),
      purchaseDate: '2026-10-01',
    }),
    makePurchase([{ name: 'Arroz', unitPrice: 8 }], {
      id: uuid(3),
      purchaseDate: '2026-10-01',
      createdAt: '2026-10-01T18:00:00.000Z',
    }),
  ]);
}

describe('ListLowestPricesUseCase (RN-06/RN-07; AC-08, AC-09, AC-10, AC-12)', () => {
  it('une café e cafe em um item com o menor preço (AC-08, AC-10)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const result = await useCase.execute();

    expect(result.items).toEqual([
      { name: 'Arroz', nameNormalized: 'arroz', lowestUnitPrice: 8 },
      { name: 'CAFE', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
    ]);
  });

  it('busca `cafe` encontra o item registrado como `café` (AC-09)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const result = await useCase.execute('cafe');

    expect(result.items).toEqual([
      { name: 'CAFE', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
    ]);
  });

  it('busca sem resultado devolve lista vazia — empty de busca (AC-09)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const result = await useCase.execute('cerveja');

    expect(result.items).toEqual([]);
  });

  it('query ausente ou só espaços lista todo o histórico (RN-07a; AC-12)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const all = await useCase.execute();
    const blank = await useCase.execute('   ');

    expect(all.items.map((item) => item.nameNormalized)).toEqual([
      'arroz',
      'cafe',
    ]);
    expect(blank).toEqual(all);
  });

  it('sem histórico devolve lista vazia — insumo do empty state (AC-12)', async () => {
    const useCase = new ListLowestPricesUseCase(new InMemoryPurchaseRepository());

    await expect(useCase.execute()).resolves.toEqual({ items: [] });
  });
});
