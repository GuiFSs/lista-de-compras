import { randomUUID } from 'node:crypto';
import type { DuplicateResolution, ItemUnit } from '@lista/contracts';
import { normalizeItemName } from '../../domain/item-name';
import {
  addPlannedQuantity,
  createShoppingListItem,
} from '../../domain/shopping-list-item';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import { validateItemFields } from '../../domain/item-validation';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface CreateShoppingListItemCommand {
  name: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  /** Default `'reject'`; `'sum-planned-quantity'` soma ao item de mesmo nome (CD-02). */
  duplicateResolution?: DuplicateResolution;
}

/**
 * Criar item (`POST /api/shopping-list/items`). Nome existente não gera segundo
 * item: com `sum-planned-quantity` soma a quantidade ao existente; caso
 * contrário devolve conflito de duplicidade (RN-04/CD-02).
 */
export class CreateShoppingListItemUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: CreateShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    const validation = validateItemFields(command);
    if (validation !== null) {
      return { ok: false, error: { code: 'validation', error: validation } };
    }

    const existing = await this.repository.findActiveByNameNormalized(
      normalizeItemName(command.name),
    );
    if (existing !== null) {
      return this.resolveExisting(existing, command);
    }

    const now = new Date();
    await this.repository.insert(
      createShoppingListItem({
        id: randomUUID(),
        name: command.name,
        plannedQuantity: command.plannedQuantity ?? null,
        unit: command.unit ?? null,
        plannedPrice: command.plannedPrice ?? null,
        createdAt: now,
      }),
    );
    return {
      ok: true,
      items: await loadActiveItems(this.repository),
      created: true,
    };
  }

  private async resolveExisting(
    existing: ShoppingListItem,
    command: CreateShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    if (command.duplicateResolution !== 'sum-planned-quantity') {
      return {
        ok: false,
        error: {
          code: 'duplicate-item-name',
          duplicateOf: { id: existing.id, name: existing.name },
        },
      };
    }

    const summed = addPlannedQuantity(
      existing,
      command.plannedQuantity ?? null,
      new Date(),
    );
    if (summed !== existing) {
      await this.repository.update(summed);
    }
    return {
      ok: true,
      items: await loadActiveItems(this.repository),
      created: false,
    };
  }
}
