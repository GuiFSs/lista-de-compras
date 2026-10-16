import type { ItemUnit } from '@lista/contracts';
import type {
  PurchasedDetails,
  ShoppingListItem,
} from '../../../../domain/shopping-list-item';
import { isItemUnit } from '../../../../domain/item-unit';
import type {
  NewShoppingListItemRow,
  ShoppingListItemRow,
} from '../schema';

/** Converte uma linha da tabela na entidade de domínio. */
export function toDomainItem(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    name: row.name,
    nameNormalized: row.nameNormalized,
    plannedQuantity: row.plannedQuantity,
    unit: toItemUnit(row.unit),
    plannedPrice: row.plannedPrice,
    purchased: toPurchasedDetails(row),
    removedAt: row.removedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Colunas gravadas a partir de um item novo (id/createdAt vêm do domínio). */
export function toRowValues(item: ShoppingListItem): NewShoppingListItemRow {
  return {
    id: item.id,
    name: item.name,
    nameNormalized: item.nameNormalized,
    plannedQuantity: item.plannedQuantity,
    unit: item.unit,
    plannedPrice: item.plannedPrice,
    ...toPurchaseColumns(item.purchased),
    removedAt: item.removedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Colunas atualizáveis de um item existente; id/createdAt não mudam. */
export function toUpdateValues(
  item: ShoppingListItem,
): Omit<NewShoppingListItemRow, 'id' | 'createdAt'> {
  return {
    name: item.name,
    nameNormalized: item.nameNormalized,
    plannedQuantity: item.plannedQuantity,
    unit: item.unit,
    plannedPrice: item.plannedPrice,
    ...toPurchaseColumns(item.purchased),
    removedAt: item.removedAt,
    updatedAt: item.updatedAt,
  };
}

function toPurchaseColumns(purchased: PurchasedDetails | null) {
  return {
    purchasedQuantity: purchased?.quantity ?? null,
    purchasedUnit: purchased?.unit ?? null,
    unitPrice: purchased?.unitPrice ?? null,
    purchasedAt: purchased?.purchasedAt ?? null,
  };
}

/** `null` ⇒ pendente (RN-11). Com `purchased_at`, os três dados vêm juntos. */
function toPurchasedDetails(row: ShoppingListItemRow): PurchasedDetails | null {
  if (row.purchasedAt === null) {
    return null;
  }
  return {
    quantity: requireNumber(row.purchasedQuantity, 'purchased_quantity'),
    unit: parseItemUnit(row.purchasedUnit, 'purchased_unit'),
    unitPrice: requireNumber(row.unitPrice, 'unit_price'),
    purchasedAt: row.purchasedAt,
  };
}

function toItemUnit(value: string | null): ItemUnit | null {
  return value === null ? null : parseItemUnit(value, 'unit');
}

/**
 * Unidade fora das sete do contrato só aparece por escrita fora da aplicação
 * (RN-05); falha alto em vez de propagar um valor inválido ao domínio.
 */
function parseItemUnit(value: string | null, column: string): ItemUnit {
  if (value === null || !isItemUnit(value)) {
    throw new Error(`Unidade inválida na coluna ${column} de shopping_list_items`);
  }
  return value;
}

function requireNumber(value: number | null, column: string): number {
  if (value === null) {
    throw new Error(`Coluna ${column} ausente em item comprado`);
  }
  return value;
}
