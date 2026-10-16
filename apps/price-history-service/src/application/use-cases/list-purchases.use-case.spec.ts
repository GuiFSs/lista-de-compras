import { describe, expect, it } from 'vitest';
import { ListPurchasesUseCase } from './list-purchases.use-case';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { makePurchase, uuid } from './testing/purchase-fixtures';

describe('ListPurchasesUseCase (RN-08; AC-06, AC-12)', () => {
  it('lista as compras da mais recente para a mais antiga, com itemCount (AC-06)', async () => {
    const repository = new InMemoryPurchaseRepository([
      makePurchase(
        [
          { name: 'Café', unitPrice: 9.9 },
          { name: 'Arroz', unitPrice: 7.5 },
        ],
        {
          id: uuid(1),
          purchaseDate: '2026-09-30',
          createdAt: '2026-09-30T10:00:00.000Z',
        },
      ),
      makePurchase([{ name: 'Feijão', unitPrice: 8 }], {
        id: uuid(2),
        purchaseDate: '2026-10-05',
        createdAt: '2026-10-05T09:00:00.000Z',
      }),
    ]);
    const useCase = new ListPurchasesUseCase(repository);

    const result = await useCase.execute();

    expect(result.purchases.map((purchase) => purchase.id)).toEqual([
      uuid(2),
      uuid(1),
    ]);
    expect(result.purchases[1]).toEqual({
      id: uuid(1),
      market: 'Mercado Central',
      purchaseDate: '2026-09-30',
      itemCount: 2,
      createdAt: '2026-09-30T10:00:00.000Z',
    });
  });

  it('empate de data ordena pelo registro mais recente (RN-08)', async () => {
    const repository = new InMemoryPurchaseRepository([
      makePurchase([{ name: 'Café', unitPrice: 9.9 }], {
        id: uuid(1),
        purchaseDate: '2026-10-01',
        createdAt: '2026-10-01T08:00:00.000Z',
      }),
      makePurchase([{ name: 'Arroz', unitPrice: 7.5 }], {
        id: uuid(2),
        purchaseDate: '2026-10-01',
        createdAt: '2026-10-01T18:00:00.000Z',
      }),
    ]);
    const useCase = new ListPurchasesUseCase(repository);

    const result = await useCase.execute();

    expect(result.purchases.map((purchase) => purchase.id)).toEqual([
      uuid(2),
      uuid(1),
    ]);
  });

  it('sem compras devolve lista vazia — insumo do empty state (AC-12)', async () => {
    const useCase = new ListPurchasesUseCase(new InMemoryPurchaseRepository());

    await expect(useCase.execute()).resolves.toEqual({ purchases: [] });
  });
});
