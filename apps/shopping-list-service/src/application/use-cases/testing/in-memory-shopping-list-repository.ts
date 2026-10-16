import type { ShoppingListItem } from '../../../domain/shopping-list-item';
import { ShoppingListRepository } from '../../ports/shopping-list-repository.port';

/**
 * Repositório em memória para os testes de caso de uso: imita o filtro de
 * ativos e a busca por nome normalizado do adaptador Drizzle, sem banco.
 */
export class InMemoryShoppingListRepository extends ShoppingListRepository {
  private readonly items = new Map<string, ShoppingListItem>();

  constructor(seed: readonly ShoppingListItem[] = []) {
    super();
    for (const item of seed) {
      this.items.set(item.id, item);
    }
  }

  async findActive(): Promise<ShoppingListItem[]> {
    return [...this.items.values()]
      .filter((item) => item.removedAt === null)
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id),
      );
  }

  async findById(id: string): Promise<ShoppingListItem | null> {
    return this.items.get(id) ?? null;
  }

  async findActiveByNameNormalized(
    nameNormalized: string,
  ): Promise<ShoppingListItem | null> {
    return (
      [...this.items.values()].find(
        (item) =>
          item.removedAt === null && item.nameNormalized === nameNormalized,
      ) ?? null
    );
  }

  async insert(item: ShoppingListItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async update(item: ShoppingListItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async deleteByIds(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      this.items.delete(id);
    }
  }

  /** Leitura direta para asserções (inclui itens removidos). */
  stored(id: string): ShoppingListItem | null {
    return this.items.get(id) ?? null;
  }
}
