import { sortItemsForList } from '../../domain/shopping-list-item';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';

/** Lista ativa na ordem de exibição (RN-18); devolvida por obter e por toda mutação. */
export async function loadActiveItems(
  repository: ShoppingListRepository,
): Promise<ShoppingListItem[]> {
  return sortItemsForList(await repository.findActive());
}
