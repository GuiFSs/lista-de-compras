import { describe, expect, it } from 'vitest';
import { CheckoutShoppingListUseCase } from './checkout-shopping-list.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { makeItem, purchasedItem } from './testing/item-fixtures';

describe('CheckoutShoppingListUseCase (RN-14…RN-16/AC-19…AC-21)', () => {
  it('remove apenas os comprados e mantém os pendentes intactos (AC-19)', async () => {
    const pending = makeItem({
      id: 'pendente',
      name: 'Arroz',
      plannedQuantity: 2,
      unit: 'kg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const bought = purchasedItem({
      id: 'comprado',
      name: 'Café',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const repository = new InMemoryShoppingListRepository([pending, bought]);
    const useCase = new CheckoutShoppingListUseCase(repository);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items.map((item) => item.id)).toEqual(['pendente']);
    expect(repository.stored('pendente')).toEqual(pending);
    expect(repository.stored('comprado')).toBeNull();
  });

  it('sem comprados nada sai nem é gravado (AC-20)', async () => {
    const first = makeItem({ id: 'a', name: 'Arroz' });
    const second = makeItem({ id: 'b', name: 'Feijão' });
    const repository = new InMemoryShoppingListRepository([first, second]);
    const useCase = new CheckoutShoppingListUseCase(repository);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(repository.stored('a')).toEqual(first);
    expect(repository.stored('b')).toEqual(second);
  });
});
