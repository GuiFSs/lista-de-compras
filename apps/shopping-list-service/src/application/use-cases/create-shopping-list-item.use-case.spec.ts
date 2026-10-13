import { describe, expect, it } from 'vitest';
import { CreateShoppingListItemUseCase } from './create-shopping-list-item.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { makeItem } from './testing/item-fixtures';

describe('CreateShoppingListItemUseCase (RN-03/RN-04/CD-02)', () => {
  it('cria o item só com o nome e os opcionais vazios (AC-04)', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new CreateShoppingListItemUseCase(repository);

    const result = await useCase.execute({ name: '  Café  ' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
      purchased: null,
    });
  });

  it('nome existente com resolução default → conflito sem criar segundo item (AC-07/AC-09)', async () => {
    const existing = makeItem({
      id: 'existente',
      name: 'Café',
      plannedQuantity: 3,
    });
    const repository = new InMemoryShoppingListRepository([existing]);
    const useCase = new CreateShoppingListItemUseCase(repository);

    const result = await useCase.execute({ name: 'cafe', plannedQuantity: 2 });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'duplicate-item-name',
        duplicateOf: { id: 'existente', name: 'Café' },
      },
    });
    expect(repository.stored('existente')?.plannedQuantity).toBe(3);
    expect(await repository.findActive()).toHaveLength(1);
  });

  it('duplicateResolution sum-planned-quantity soma ao existente, sem criar segundo item (CD-02)', async () => {
    const existing = makeItem({
      id: 'existente',
      name: 'Café',
      plannedQuantity: 3,
    });
    const repository = new InMemoryShoppingListRepository([existing]);
    const useCase = new CreateShoppingListItemUseCase(repository);

    const result = await useCase.execute({
      name: 'CAFE ',
      plannedQuantity: 2,
      duplicateResolution: 'sum-planned-quantity',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 'existente', plannedQuantity: 5 });
  });

  it('sum sem quantidade informada mantém o existente como estava (RN-04)', async () => {
    const existing = makeItem({
      id: 'existente',
      name: 'Café',
      plannedQuantity: 3,
    });
    const repository = new InMemoryShoppingListRepository([existing]);
    const useCase = new CreateShoppingListItemUseCase(repository);

    const result = await useCase.execute({
      name: 'cafe',
      duplicateResolution: 'sum-planned-quantity',
    });

    expect(result.ok).toBe(true);
    expect(repository.stored('existente')?.plannedQuantity).toBe(3);
    expect(repository.stored('existente')?.updatedAt).toEqual(existing.updatedAt);
  });

  it('nome em branco → erro de validação e nenhum item criado (AC-05)', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new CreateShoppingListItemUseCase(repository);

    const result = await useCase.execute({ name: '   ' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'validation', error: 'name-required' },
    });
    expect(await repository.findActive()).toEqual([]);
  });

  it('quantidade não positiva e preço negativo → validação (RN-06/AC-05)', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new CreateShoppingListItemUseCase(repository);

    await expect(
      useCase.execute({ name: 'Arroz', plannedQuantity: 0 }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', error: 'quantity-not-positive' },
    });
    await expect(
      useCase.execute({ name: 'Arroz', plannedPrice: -1 }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', error: 'price-negative' },
    });
    await expect(
      useCase.execute({ name: 'Arroz', unit: 'litro' as never }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', error: 'unit-invalid' },
    });
  });
});
