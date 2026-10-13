import { describe, expect, it } from 'vitest';
import { UpdateShoppingListItemUseCase } from './update-shopping-list-item.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { LATER, makeItem } from './testing/item-fixtures';

describe('UpdateShoppingListItemUseCase (RN-03/RN-04/CD-13/AC-08)', () => {
  it('conflito com outro item ativo NÃO aplica nem soma e deixa o alvo inalterado (AC-08)', async () => {
    const target = makeItem({
      id: 'alvo',
      name: 'Café',
      plannedQuantity: 1,
    });
    const other = makeItem({
      id: 'outro',
      name: 'Cebola',
      plannedQuantity: 5,
    });
    const repository = new InMemoryShoppingListRepository([target, other]);
    const useCase = new UpdateShoppingListItemUseCase(repository);

    const result = await useCase.execute({
      id: 'alvo',
      name: 'CEBOLA',
      plannedQuantity: 3,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'name-conflict',
        duplicateOf: { id: 'outro', name: 'Cebola' },
      },
    });
    expect(repository.stored('alvo')).toMatchObject({
      name: 'Café',
      plannedQuantity: 1,
      updatedAt: target.updatedAt,
    });
    expect(repository.stored('outro')?.plannedQuantity).toBe(5);
  });

  it('renomear para o próprio nome normalizado aplica a edição (AC-08)', async () => {
    const item = makeItem({ id: 'eu', name: 'cafe' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new UpdateShoppingListItemUseCase(repository);

    const result = await useCase.execute({ id: 'eu', name: 'Café' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(repository.stored('eu')).toMatchObject({
      name: 'Café',
      nameNormalized: 'cafe',
    });
  });

  it('mantém campos ausentes e limpa os enviados como null (PATCH)', async () => {
    const item = makeItem({
      id: 'eu',
      name: 'Arroz',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 10,
    });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new UpdateShoppingListItemUseCase(repository);

    await useCase.execute({ id: 'eu', name: 'Arroz integral' });
    expect(repository.stored('eu')).toMatchObject({
      name: 'Arroz integral',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 10,
    });

    await useCase.execute({
      id: 'eu',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
    });
    expect(repository.stored('eu')).toMatchObject({
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
    });
  });

  it('preserva o estado comprado ao editar (RN-07/AC-17)', async () => {
    const item = makeItem({
      id: 'eu',
      name: 'Café',
      purchased: {
        quantity: 1,
        unit: 'unidade',
        unitPrice: 5,
        purchasedAt: LATER,
      },
    });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new UpdateShoppingListItemUseCase(repository);

    await useCase.execute({ id: 'eu', plannedQuantity: 4 });

    expect(repository.stored('eu')?.purchased).toEqual(item.purchased);
  });

  it('id inexistente ou removido → not-found (contrato 404)', async () => {
    const removed = makeItem({
      id: 'removido',
      removedAt: LATER,
    });
    const repository = new InMemoryShoppingListRepository([removed]);
    const useCase = new UpdateShoppingListItemUseCase(repository);

    await expect(useCase.execute({ id: 'nada', name: 'X' })).resolves.toEqual({
      ok: false,
      error: { code: 'not-found' },
    });
    await expect(
      useCase.execute({ id: 'removido', name: 'X' }),
    ).resolves.toEqual({ ok: false, error: { code: 'not-found' } });
  });

  it('valores inválidos → erro de validação (RN-06)', async () => {
    const item = makeItem({ id: 'eu', name: 'Arroz' });
    const repository = new InMemoryShoppingListRepository([item]);
    const useCase = new UpdateShoppingListItemUseCase(repository);

    await expect(
      useCase.execute({ id: 'eu', plannedQuantity: 0 }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', error: 'quantity-not-positive' },
    });
  });
});
