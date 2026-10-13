import { describe, expect, it } from 'vitest';
import { DeleteShoppingListItemUseCase } from './delete-shopping-list-item.use-case';
import { RestoreShoppingListItemUseCase } from './restore-shopping-list-item.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { LATER, makeItem, purchasedItem } from './testing/item-fixtures';

describe('DeleteShoppingListItemUseCase (RN-08/AC-11)', () => {
  it('faz soft delete: o item sai da lista ativa e o Desfazer ainda o encontra', async () => {
    const item = makeItem({ id: 'item-1', name: 'Café' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new DeleteShoppingListItemUseCase(repository);

    const result = await useCase.execute({ id: 'item-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items).toEqual([]);
    expect(repository.stored('item-1')?.removedAt).toBeInstanceOf(Date);
  });

  it('é idempotente para id inexistente ou já removido', async () => {
    const removed = makeItem({ id: 'removido', removedAt: LATER });
    const repository = new InMemoryShoppingListRepository([removed]);
    const useCase = new DeleteShoppingListItemUseCase(repository);

    await expect(useCase.execute({ id: 'nada' })).resolves.toEqual({
      ok: true,
      items: [],
    });
    await expect(useCase.execute({ id: 'removido' })).resolves.toEqual({
      ok: true,
      items: [],
    });
    expect(repository.stored('removido')?.removedAt).toEqual(LATER);
  });
});

describe('RestoreShoppingListItemUseCase (RN-08/AC-11)', () => {
  it('restaura o item com os mesmos dados, inclusive o estado comprado', async () => {
    const item = purchasedItem({
      id: 'item-1',
      name: 'Café',
      removedAt: LATER,
    });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new RestoreShoppingListItemUseCase(repository);

    const result = await useCase.execute({ id: 'item-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'item-1',
      name: 'Café',
      removedAt: null,
      purchased: item.purchased,
    });
  });

  it('recusa com conflito quando o nome já foi retomado por outro item ativo (AC-11)', async () => {
    const removed = makeItem({ id: 'antigo', name: 'Café', removedAt: LATER });
    const active = makeItem({ id: 'novo', name: 'CAFE' });
    const repository = new InMemoryShoppingListRepository([removed, active]);
    const useCase = new RestoreShoppingListItemUseCase(repository);

    const result = await useCase.execute({ id: 'antigo' });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'name-conflict',
        duplicateOf: { id: 'novo', name: 'CAFE' },
      },
    });
    expect(repository.stored('antigo')?.removedAt).toEqual(LATER);
    expect(repository.stored('novo')?.removedAt).toBeNull();
  });

  it('id que nunca existiu → not-found', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new RestoreShoppingListItemUseCase(repository);

    await expect(useCase.execute({ id: 'nada' })).resolves.toEqual({
      ok: false,
      error: { code: 'not-found' },
    });
  });

  it('id já ativo é devolvido na lista sem erro', async () => {
    const item = makeItem({ id: 'ativo', name: 'Café' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new RestoreShoppingListItemUseCase(repository);

    await expect(useCase.execute({ id: 'ativo' })).resolves.toEqual({
      ok: true,
      items: [item],
    });
  });
});
