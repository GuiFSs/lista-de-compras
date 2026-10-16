import type { ShoppingListItem } from '../../domain/shopping-list-item';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';

/** Obter a lista ativa (`GET /api/shopping-list`) — RN-19/AC-24. */
export class GetShoppingListUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  execute(): Promise<ShoppingListItem[]> {
    return loadActiveItems(this.repository);
  }
}
