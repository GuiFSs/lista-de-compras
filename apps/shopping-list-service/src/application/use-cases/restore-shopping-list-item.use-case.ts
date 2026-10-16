import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface RestoreShoppingListItemCommand {
  id: string;
}

/**
 * Restaurar (Desfazer) um item excluído (`POST .../{id}/restore`): devolve os
 * mesmos dados, inclusive o estado comprado. Se o nome já tiver sido retomado
 * por outro item ativo, recusa com conflito — sem tocar no item (RN-08).
 */
export class RestoreShoppingListItemUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: RestoreShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    const item = await this.repository.findById(command.id);
    if (item === null) {
      return { ok: false, error: { code: 'not-found' } };
    }
    if (item.removedAt === null) {
      return { ok: true, items: await loadActiveItems(this.repository) };
    }

    const conflict = await this.repository.findActiveByNameNormalized(
      item.nameNormalized,
    );
    if (conflict !== null) {
      return {
        ok: false,
        error: {
          code: 'name-conflict',
          duplicateOf: { id: conflict.id, name: conflict.name },
        },
      };
    }

    const now = new Date();
    await this.repository.update({ ...item, removedAt: null, updatedAt: now });
    return { ok: true, items: await loadActiveItems(this.repository) };
  }
}
