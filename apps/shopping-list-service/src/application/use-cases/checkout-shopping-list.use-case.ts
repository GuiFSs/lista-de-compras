import { sortItemsForList, splitForCheckout } from '../../domain/shopping-list-item';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import type { ShoppingListResult } from './shopping-list-result';

/**
 * Concluir a compra (`POST /api/shopping-list/checkout`): remove fisicamente
 * apenas os comprados; os demais permanecem intactos. Nada é gravado nem
 * publicado, e sem comprados nada sai (RN-14…RN-16/AC-19…AC-21).
 */
export class CheckoutShoppingListUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(): Promise<ShoppingListResult> {
    const split = splitForCheckout(await this.repository.findActive());
    if (split.removed.length > 0) {
      await this.repository.deleteByIds(split.removed.map((item) => item.id));
    }
    return { ok: true, items: sortItemsForList(split.remaining) };
  }
}
