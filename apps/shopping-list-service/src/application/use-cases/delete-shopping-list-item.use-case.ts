import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface DeleteShoppingListItemCommand {
  id: string;
}

/**
 * Excluir item (`DELETE /api/shopping-list/items/{id}`): soft delete
 * (`removed_at`) que alimenta o Desfazer (RN-08). Idempotente — id inexistente
 * ou já removido devolve a lista como está.
 */
export class DeleteShoppingListItemUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: DeleteShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    const item = await this.repository.findById(command.id);
    if (item !== null && item.removedAt === null) {
      const now = new Date();
      await this.repository.update({ ...item, removedAt: now, updatedAt: now });
    }
    return { ok: true, items: await loadActiveItems(this.repository) };
  }
}
