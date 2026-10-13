import { createShoppingListItem } from '../../../domain/shopping-list-item';
import type {
  PurchasedDetails,
  ShoppingListItem,
} from '../../../domain/shopping-list-item';

export const BASE_TIME = new Date('2026-01-01T00:00:00.000Z');
export const LATER = new Date('2026-02-01T00:00:00.000Z');

export function makeItem(
  overrides: Partial<ShoppingListItem> = {},
): ShoppingListItem {
  const name = overrides.name ?? 'Café';
  const base = createShoppingListItem({
    id: overrides.id ?? 'item-1',
    name,
    plannedQuantity: overrides.plannedQuantity ?? null,
    unit: overrides.unit ?? null,
    plannedPrice: overrides.plannedPrice ?? null,
    createdAt: overrides.createdAt ?? BASE_TIME,
  });
  return { ...base, ...overrides, name };
}

export function purchasedItem(
  overrides: Partial<ShoppingListItem> = {},
): ShoppingListItem {
  const purchased: PurchasedDetails = {
    quantity: 2,
    unit: 'kg',
    unitPrice: 9.9,
    purchasedAt: BASE_TIME,
  };
  return makeItem({ ...overrides, purchased });
}
