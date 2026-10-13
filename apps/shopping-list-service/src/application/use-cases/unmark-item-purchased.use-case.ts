import { unmarkItemPurchased } from '../../domain/shopping-list-item';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface UnmarkItemPurchasedCommand {
  id: string;
}

/**
 * Desmarcar (`DELETE .../{id}/purchase`): volta a pendente e limpa os dados da
 * compra no serviço (RN-12). Idempotente em item já pendente.
 */
export class UnmarkItemPurchasedUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: UnmarkItemPurchasedCommand,
  ): Promise<ShoppingListResult> {
    const item = await this.repository.findById(command.id);
    if (item === null || item.removedAt !== null) {
      return { ok: false, error: { code: 'not-found' } };
    }

    const unmarked = unmarkItemPurchased(item, new Date());
    if (unmarked !== item) {
      await this.repository.update(unmarked);
    }
    return { ok: true, items: await loadActiveItems(this.repository) };
  }
}
