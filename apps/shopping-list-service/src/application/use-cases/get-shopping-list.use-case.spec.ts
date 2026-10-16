import { describe, expect, it } from 'vitest';
import { GetShoppingListUseCase } from './get-shopping-list.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { makeItem, purchasedItem } from './testing/item-fixtures';

describe('GetShoppingListUseCase (RN-18/RN-19/AC-24)', () => {
  it('devolve a lista ativa ordenada: pendentes → comprados, sem removidos', async () => {
    const pending = makeItem({
      id: 'pendente',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    const bought = purchasedItem({
      id: 'comprado',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const removed = makeItem({
      id: 'removido',
      removedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    const useCase = new GetShoppingListUseCase(
      new InMemoryShoppingListRepository([bought, pending, removed]),
    );

    const items = await useCase.execute();

    expect(items.map((item) => item.id)).toEqual(['pendente', 'comprado']);
  });

  it('devolve lista vazia quando não há itens ativos', async () => {
    const useCase = new GetShoppingListUseCase(
      new InMemoryShoppingListRepository(),
    );

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
