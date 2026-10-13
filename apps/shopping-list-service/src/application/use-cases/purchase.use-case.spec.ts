import { describe, expect, it } from 'vitest';
import { MarkItemPurchasedUseCase } from './mark-item-purchased.use-case';
import { UnmarkItemPurchasedUseCase } from './unmark-item-purchased.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { LATER, makeItem, purchasedItem } from './testing/item-fixtures';

describe('MarkItemPurchasedUseCase (RN-09/RN-11/AC-12)', () => {
  it('guarda os três dados e mantém o item na lista', async () => {
    const item = makeItem({
      id: 'item-1',
      name: 'Café',
      plannedQuantity: 2,
      unit: 'kg',
    });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new MarkItemPurchasedUseCase(repository);

    const result = await useCase.execute({
      id: 'item-1',
      purchasedQuantity: 2.4,
      unit: 'kg',
      unitPrice: 9.9,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items).toHaveLength(1);
    expect(result.items[0].purchased).toMatchObject({
      quantity: 2.4,
      unit: 'kg',
      unitPrice: 9.9,
    });
  });

  it('campo obrigatório inválido → validação e item inalterado (AC-13)', async () => {
    const item = makeItem({ id: 'item-1', name: 'Café' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new MarkItemPurchasedUseCase(repository);

    await expect(
      useCase.execute({
        id: 'item-1',
        purchasedQuantity: 0,
        unit: 'kg',
        unitPrice: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', error: 'quantity-not-positive' },
    });
    await expect(
      useCase.execute({
        id: 'item-1',
        purchasedQuantity: 1,
        unit: 'kg',
        unitPrice: -1,
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', error: 'price-negative' },
    });
    expect(repository.stored('item-1')?.purchased).toBeNull();
  });

  it('id inexistente ou removido → not-found', async () => {
    const removed = makeItem({ id: 'removido', removedAt: LATER });
    const repository = new InMemoryShoppingListRepository([removed]);
    const useCase = new MarkItemPurchasedUseCase(repository);

    await expect(
      useCase.execute({
        id: 'nada',
        purchasedQuantity: 1,
        unit: 'unidade',
        unitPrice: 1,
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'not-found' } });
    await expect(
      useCase.execute({
        id: 'removido',
        purchasedQuantity: 1,
        unit: 'unidade',
        unitPrice: 1,
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'not-found' } });
  });
});

describe('UnmarkItemPurchasedUseCase (RN-12/AC-16)', () => {
  it('volta a pendente e limpa os dados da compra', async () => {
    const item = purchasedItem({ id: 'item-1', name: 'Café' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new UnmarkItemPurchasedUseCase(repository);

    const result = await useCase.execute({ id: 'item-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items[0].purchased).toBeNull();
  });

  it('é idempotente em item já pendente', async () => {
    const item = makeItem({ id: 'item-1', name: 'Café' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new UnmarkItemPurchasedUseCase(repository);

    const result = await useCase.execute({ id: 'item-1' });

    expect(result.ok).toBe(true);
    expect(repository.stored('item-1')?.updatedAt).toEqual(item.updatedAt);
  });

  it('id inexistente → not-found', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new UnmarkItemPurchasedUseCase(repository);

    await expect(useCase.execute({ id: 'nada' })).resolves.toEqual({
      ok: false,
      error: { code: 'not-found' },
    });
  });
});
