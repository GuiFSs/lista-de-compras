import { describe, expect, it } from 'vitest';
import { ListLowestPricesUseCase } from './list-lowest-prices.use-case';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { makePurchase, uuid } from './testing/purchase-fixtures';

function repository(): InMemoryPurchaseRepository {
  return new InMemoryPurchaseRepository([
    makePurchase([{ name: 'café', unitPrice: 12 }], {
      id: uuid(1),
      market: 'Atacadão',
      purchaseDate: '2026-09-01',
    }),
    makePurchase([{ name: 'CAFE', unitPrice: 7.5 }], {
      id: uuid(2),
      market: 'Zaffari',
      purchaseDate: '2026-10-01',
    }),
    makePurchase([{ name: 'Arroz', unitPrice: 8 }], {
      id: uuid(3),
      market: 'Atacadão',
      purchaseDate: '2026-10-01',
    }),
  ]);
}

describe('ListLowestPricesUseCase (RN-05/RN-07; AC-01, AC-02, AC-09)', () => {
  it('une café e cafe em um item com o menor preço, agrupado pelo mercado vencedor (AC-01, AC-02)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const result = await useCase.execute();

    expect(result).toEqual({
      markets: [
        {
          market: 'Atacadão',
          items: [
            {
              name: 'Arroz',
              nameNormalized: 'arroz',
              lowestUnitPrice: 8,
              market: 'Atacadão',
              purchaseDate: '2026-10-01',
              quantity: 1,
              unit: 'unidade',
            },
          ],
        },
        {
          market: 'Zaffari',
          items: [
            {
              name: 'CAFE',
              nameNormalized: 'cafe',
              lowestUnitPrice: 7.5,
              market: 'Zaffari',
              purchaseDate: '2026-10-01',
              quantity: 1,
              unit: 'unidade',
            },
          ],
        },
      ],
    });
  });

  it('busca `cafe` encontra `café` e mantém o agrupamento do mercado (AC-09)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const result = await useCase.execute('cafe');

    expect(result.markets).toEqual([
      {
        market: 'Zaffari',
        items: [
          {
            name: 'CAFE',
            nameNormalized: 'cafe',
            lowestUnitPrice: 7.5,
            market: 'Zaffari',
            purchaseDate: '2026-10-01',
            quantity: 1,
            unit: 'unidade',
          },
        ],
      },
    ]);
  });

  it('filtro `a` casa itens em dois mercados e preserva os grupos em A→Z (AC-09, AC-02)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    // `a` casa arroz (Atacadão) e cafe (Zaffari): o filtro não pode achatar o
    // agrupamento nem reordenar os mercados.
    const result = await useCase.execute('a');

    expect(result.markets.map((group) => group.market)).toEqual([
      'Atacadão',
      'Zaffari',
    ]);
    expect(
      result.markets.map((group) =>
        group.items.map((item) => item.nameNormalized),
      ),
    ).toEqual([['arroz'], ['cafe']]);
  });

  it('filtro não deixa grupo vazio: mercado sem item filtrado desaparece (AC-02, AC-09)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const result = await useCase.execute('arr');

    expect(result.markets.map((group) => group.market)).toEqual(['Atacadão']);
    expect(result.markets[0].items.map((item) => item.nameNormalized)).toEqual([
      'arroz',
    ]);
  });

  it('busca sem resultado devolve lista vazia de grupos — empty de busca (AC-09)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    await expect(useCase.execute('cerveja')).resolves.toEqual({ markets: [] });
  });

  it('query ausente ou só espaços lista todo o histórico (RN-07a)', async () => {
    const useCase = new ListLowestPricesUseCase(repository());

    const all = await useCase.execute();
    const blank = await useCase.execute('   ');

    expect(
      all.markets.flatMap((group) =>
        group.items.map((item) => item.nameNormalized),
      ),
    ).toEqual(['arroz', 'cafe']);
    expect(blank).toEqual(all);
  });

  it('sem histórico devolve lista vazia — insumo do empty state (AC-10, AC-12)', async () => {
    const useCase = new ListLowestPricesUseCase(
      new InMemoryPurchaseRepository(),
    );

    await expect(useCase.execute()).resolves.toEqual({ markets: [] });
  });

  it('não muta o repositório (AC-09)', async () => {
    const repo = repository();
    const useCase = new ListLowestPricesUseCase(repo);

    await useCase.execute('cafe');

    expect(repo.count()).toBe(3);
    expect(repo.stored(uuid(2))?.items[0].name).toBe('CAFE');
  });
});
