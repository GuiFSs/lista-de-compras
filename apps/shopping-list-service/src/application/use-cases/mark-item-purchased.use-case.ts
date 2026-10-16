import type { ItemUnit } from '@lista/contracts';
import { markItemPurchased } from '../../domain/shopping-list-item';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface MarkItemPurchasedCommand {
  id: string;
  purchasedQuantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

/**
 * Marcar como comprado (`PUT .../{id}/purchase`): exige quantidade comprada,
 * unidade e preço por unidade; o item segue na lista (RN-09/RN-11).
 */
export class MarkItemPurchasedUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: MarkItemPurchasedCommand,
  ): Promise<ShoppingListResult> {
    const item = await this.repository.findById(command.id);
    if (item === null || item.removedAt !== null) {
      return { ok: false, error: { code: 'not-found' } };
    }

    const result = markItemPurchased(
      item,
      {
        purchasedQuantity: command.purchasedQuantity,
        unit: command.unit,
        unitPrice: command.unitPrice,
      },
      new Date(),
    );
    if (!result.ok) {
      return { ok: false, error: { code: 'validation', error: result.error } };
    }

    await this.repository.update(result.item);
    return { ok: true, items: await loadActiveItems(this.repository) };
  }
}
