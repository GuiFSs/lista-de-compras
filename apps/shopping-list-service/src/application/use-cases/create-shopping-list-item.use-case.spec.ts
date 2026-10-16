import { describe, expect, it } from 'vitest';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import { ActiveItemNameConflictError } from '../ports/shopping-list-repository.port';
import { CreateShoppingListItemUseCase } from './create-shopping-list-item.use-case';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { makeItem } from './testing/item-fixtures';

/**
 * Simula a corrida da criação (T-18): a primeira busca de nome não vê o item
 * concorrente (TOCTOU) e o insert esbarra no índice único parcial, como faz o
 * adaptador Drizzle ao traduzir o `23505`.
 */
class ConcurrentCreateRepository extends InMemoryShoppingListRepository {
  private staleReads: number;

  constructor(seed: readonly ShoppingListItem[], staleReads = 1) {
    super(seed);
    this.staleReads = staleReads;
  }

  override async findActiveByNameNormalized(
    nameNormalized: string,
  ): Promise<ShoppingListItem | null> {
    if (this.staleReads > 0) {
      this.staleReads -= 1;
      return null;
    }
    return super.findActiveByNameNormalized(nameNormalized);
  }

  override async insert(item: ShoppingListItem): Promise<void> {
    if ((await super.findActiveByNameNormalized(item.nameNormalized)) !== null) {
      throw new ActiveItemNameConflictError();
    }
    return super.insert(item);
  }
}

/** Insert que falha por um motivo alheio à duplicidade — não pode ser engolido. */
class GenericInsertFailureRepository extends InMemoryShoppingListRepository {
  override async insert(): Promise<void> {
    throw new Error('falha inesperada no banco');
  }
}

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

  describe('corrida na criação (T-18)', () => {
    it('insert concorrente sem resolução → 409 canônico, sem somar nem duplicar', async () => {
      const winner = makeItem({
        id: 'vencedor',
        name: 'Café',
        plannedQuantity: 3,
      });
      const repository = new ConcurrentCreateRepository([winner]);
      const useCase = new CreateShoppingListItemUseCase(repository);

      const result = await useCase.execute({ name: 'cafe', plannedQuantity: 2 });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'duplicate-item-name',
          duplicateOf: { id: 'vencedor', name: 'Café' },
        },
      });
      expect(repository.stored('vencedor')?.plannedQuantity).toBe(3);
      expect(await repository.findActive()).toHaveLength(1);
    });

    it('insert concorrente com sum-planned-quantity → soma uma única vez', async () => {
      const winner = makeItem({
        id: 'vencedor',
        name: 'Café',
        plannedQuantity: 3,
      });
      const repository = new ConcurrentCreateRepository([winner]);
      const useCase = new CreateShoppingListItemUseCase(repository);

      const result = await useCase.execute({
        name: ' CAFE ',
        plannedQuantity: 2,
        duplicateResolution: 'sum-planned-quantity',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.created).toBe(false);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'vencedor',
        plannedQuantity: 5,
      });
    });

    it('erro alheio ao conflito de nome continua propagando (500 na borda)', async () => {
      const useCase = new CreateShoppingListItemUseCase(
        new GenericInsertFailureRepository(),
      );

      await expect(useCase.execute({ name: 'Arroz' })).rejects.toThrow(
        'falha inesperada no banco',
      );
    });
  });
});
