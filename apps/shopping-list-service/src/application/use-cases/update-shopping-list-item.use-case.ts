import type { ItemUnit } from '@lista/contracts';
import {
  applyItemChanges,
  findNameConflict,
  sortItemsForList,
} from '../../domain/shopping-list-item';
import type { ItemChanges } from '../../domain/shopping-list-item';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import type { ShoppingListResult } from './shopping-list-result';

export interface UpdateShoppingListItemCommand {
  id: string;
  /** Ausente = mantém; `null` = limpa (PATCH). */
  name?: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
}

/**
 * Editar item (`PATCH /api/shopping-list/items/{id}`). Se o novo nome colide
 * com OUTRO item ativo, nada é aplicado nem somado e o resultado é o conflito
 * terminal; renomear para o próprio nome normalizado aplica (RN-04/CD-13).
 */
export class UpdateShoppingListItemUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: UpdateShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    const item = await this.repository.findById(command.id);
    if (item === null || item.removedAt !== null) {
      return { ok: false, error: { code: 'not-found' } };
    }

    const changes: ItemChanges = {
      name: command.name,
      plannedQuantity: command.plannedQuantity,
      unit: command.unit,
      plannedPrice: command.plannedPrice,
    };
    const activeItems = await this.repository.findActive();
    const result = applyItemChanges(item, changes, activeItems, new Date());
    if (!result.ok) {
      if (result.reason === 'invalid') {
        return { ok: false, error: { code: 'validation', error: result.error } };
      }
      const conflict = findNameConflict(
        activeItems,
        changes.name ?? item.name,
        item.id,
      );
      if (conflict === null) {
        // Invariante: o domínio só reporta conflito de item presente em `activeItems`.
        throw new Error('Conflito de nome sem item ativo correspondente');
      }
      return {
        ok: false,
        error: {
          code: 'name-conflict',
          duplicateOf: { id: conflict.id, name: conflict.name },
        },
      };
    }

    await this.repository.update(result.item);
    return {
      ok: true,
      items: sortItemsForList(
        activeItems.map((candidate) =>
          candidate.id === result.item.id ? result.item : candidate,
        ),
      ),
    };
  }
}
