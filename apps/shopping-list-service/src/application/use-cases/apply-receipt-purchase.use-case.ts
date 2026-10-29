import { randomUUID } from 'node:crypto';
import type { ItemUnit } from '@lista/contracts';
import { normalizeItemName } from '../../domain/item-name';
import {
  createShoppingListItem,
  markItemPurchased,
} from '../../domain/shopping-list-item';
import {
  validateItemName,
  validateRequiredPrice,
  validateRequiredQuantity,
  validateRequiredUnit,
} from '../../domain/item-validation';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface ApplyReceiptLineCommand {
  name: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;
  include: boolean;
}

export interface ApplyReceiptPurchaseCommand {
  lines: readonly ApplyReceiptLineCommand[];
}

/**
 * Aplica linhas da nota: cria ou substitui e marca como comprado (RN-07).
 * Linhas com `include: false` são ignoradas; só linhas válidas entram.
 */
export class ApplyReceiptPurchaseUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: ApplyReceiptPurchaseCommand,
  ): Promise<ShoppingListResult> {
    const included = command.lines.filter((line) => line.include);
    if (included.length === 0) {
      return { ok: true, items: await loadActiveItems(this.repository) };
    }

    for (const line of included) {
      const validation =
        validateItemName(line.name) ??
        validateRequiredQuantity(line.quantity) ??
        validateRequiredUnit(line.unit) ??
        validateRequiredPrice(line.unitPrice);
      if (validation !== null) {
        return { ok: false, error: { code: 'validation', error: validation } };
      }
    }

    const now = new Date();
    for (const line of included) {
      const nameNormalized = normalizeItemName(line.name);
      const existing =
        await this.repository.findActiveByNameNormalized(nameNormalized);

      if (existing !== null) {
        const marked = markItemPurchased(
          existing,
          {
            purchasedQuantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
          },
          now,
        );
        if (!marked.ok) {
          return { ok: false, error: { code: 'validation', error: marked.error } };
        }
        await this.repository.update(marked.item);
        continue;
      }

      const created = createShoppingListItem({
        id: randomUUID(),
        name: line.name,
        plannedQuantity: line.quantity,
        unit: line.unit,
        plannedPrice: line.unitPrice,
        createdAt: now,
      });
      const marked = markItemPurchased(
        created,
        {
          purchasedQuantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
        },
        now,
      );
      if (!marked.ok) {
        return { ok: false, error: { code: 'validation', error: marked.error } };
      }
      await this.repository.insert(marked.item);
    }

    return { ok: true, items: await loadActiveItems(this.repository) };
  }
}
