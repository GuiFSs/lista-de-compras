import type { ItemUnit } from '@lista/contracts';
import { normalizeItemName } from './item-name';
import {
  validateItemName,
  validatePrice,
  validateQuantity,
  validateRequiredPrice,
  validateRequiredQuantity,
  validateRequiredUnit,
  validateUnit,
} from './item-validation';
import type { ItemValidationError } from './item-validation';

/** Dados da compra; presente no item ⇒ comprado, e o item segue na lista (RN-11). */
export interface PurchasedDetails {
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;
  purchasedAt: Date;
}

/** Item da lista ativa (RN-01). Tipo de domínio: sem formatos de HTTP ou de banco. */
export interface ShoppingListItem {
  id: string;
  /** Como digitado, apenas com trim nas extremidades. */
  name: string;
  /** Chave de comparação/unicidade do nome (RN-02/CD-12). */
  nameNormalized: string;
  plannedQuantity: number | null;
  unit: ItemUnit | null;
  plannedPrice: number | null;
  purchased: PurchasedDetails | null;
  /** Soft delete do excluir + Desfazer (RN-08); `null` ⇒ ativo na lista. */
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewItemInput {
  id: string;
  name: string;
  plannedQuantity: number | null;
  unit: ItemUnit | null;
  plannedPrice: number | null;
  createdAt: Date;
}

/** Monta um item novo já com a chave normalizada derivada no domínio (RN-02). */
export function createShoppingListItem(input: NewItemInput): ShoppingListItem {
  return {
    id: input.id,
    name: input.name.trim(),
    nameNormalized: normalizeItemName(input.name),
    plannedQuantity: input.plannedQuantity,
    unit: input.unit,
    plannedPrice: input.plannedPrice,
    purchased: null,
    removedAt: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

/**
 * Soma a quantidade planejada informada à existente (RN-04/CD-02). Sem
 * quantidade informada o item fica como estava; item sem quantidade planejada
 * recebe a informada.
 */
export function addPlannedQuantity(
  item: ShoppingListItem,
  quantity: number | null | undefined,
  updatedAt: Date,
): ShoppingListItem {
  if (quantity === null || quantity === undefined) {
    return item;
  }
  return {
    ...item,
    plannedQuantity: (item.plannedQuantity ?? 0) + quantity,
    updatedAt,
  };
}

export interface MarkPurchasedInput {
  purchasedQuantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

export type MarkPurchasedResult =
  | { ok: true; item: ShoppingListItem }
  | { ok: false; error: ItemValidationError };

/**
 * Marca o item como comprado (RN-09/RN-11): valida os três dados mesmo que a
 * borda já valide, e mantém o item na lista (não remove nada).
 */
export function markItemPurchased(
  item: ShoppingListItem,
  input: MarkPurchasedInput,
  purchasedAt: Date,
): MarkPurchasedResult {
  const error =
    validateRequiredQuantity(input.purchasedQuantity) ??
    validateRequiredPrice(input.unitPrice) ??
    validateRequiredUnit(input.unit);
  if (error !== null) {
    return { ok: false, error };
  }
  return {
    ok: true,
    item: {
      ...item,
      purchased: {
        quantity: input.purchasedQuantity,
        unit: input.unit,
        unitPrice: input.unitPrice,
        purchasedAt,
      },
      updatedAt: purchasedAt,
    },
  };
}

/** Desmarca: volta a pendente e limpa os dados da compra (RN-12). Idempotente. */
export function unmarkItemPurchased(
  item: ShoppingListItem,
  updatedAt: Date,
): ShoppingListItem {
  if (item.purchased === null) {
    return item;
  }
  return { ...item, purchased: null, updatedAt };
}

/**
 * Ordem de exibição (RN-18): pendentes primeiro, comprados depois; dentro de
 * cada grupo, pela criação. Não muta a lista recebida.
 */
export function sortItemsForList(
  items: readonly ShoppingListItem[],
): ShoppingListItem[] {
  return [...items].sort(compareItemsForList);
}

function compareItemsForList(
  left: ShoppingListItem,
  right: ShoppingListItem,
): number {
  const leftPurchased = left.purchased === null ? 0 : 1;
  const rightPurchased = right.purchased === null ? 0 : 1;
  if (leftPurchased !== rightPurchased) {
    return leftPurchased - rightPurchased;
  }
  const byCreation = left.createdAt.getTime() - right.createdAt.getTime();
  return byCreation !== 0 ? byCreation : left.id.localeCompare(right.id);
}

export interface CheckoutSplit {
  /** Itens comprados que saem da lista (RN-14). */
  removed: ShoppingListItem[];
  /** Itens não comprados que permanecem para a próxima compra (RN-14/RN-15). */
  remaining: ShoppingListItem[];
}

/** Divide a lista na conclusão: só os comprados saem; sem comprados, nada sai (RN-14/RN-15). */
export function splitForCheckout(
  items: readonly ShoppingListItem[],
): CheckoutSplit {
  const removed: ShoppingListItem[] = [];
  const remaining: ShoppingListItem[] = [];
  for (const item of items) {
    if (item.purchased === null) {
      remaining.push(item);
    } else {
      removed.push(item);
    }
  }
  return { removed, remaining };
}

/**
 * Item ativo, diferente de `selfId`, com o mesmo nome normalizado (RN-02).
 * `selfId = null` na criação; na edição exclui o próprio item — renomear para o
 * próprio nome normalizado não é conflito (RN-04/CD-13).
 */
export function findNameConflict(
  items: readonly ShoppingListItem[],
  name: string,
  selfId: string | null,
): ShoppingListItem | null {
  const normalized = normalizeItemName(name);
  return (
    items.find(
      (candidate) =>
        candidate.id !== selfId &&
        candidate.removedAt === null &&
        candidate.nameNormalized === normalized,
    ) ?? null
  );
}

/** Campos de edição: ausente = mantém; `null` = limpa (semântica do PATCH). */
export interface ItemChanges {
  name?: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
}

export type ItemChangeFailure =
  | { reason: 'invalid'; error: ItemValidationError }
  | { reason: 'name-conflict'; conflictingItemId: string };

export type ApplyItemChangesResult =
  | { ok: true; item: ShoppingListItem }
  | ({ ok: false } & ItemChangeFailure);

/**
 * Aplica uma edição (RN-03/RN-04/CD-13). Se o novo nome colide com OUTRO item
 * ativo, a edição não é aplicada, nada é somado e o resultado é o conflito;
 * renomear para o próprio nome normalizado aplica normalmente.
 */
export function applyItemChanges(
  item: ShoppingListItem,
  changes: ItemChanges,
  items: readonly ShoppingListItem[],
  updatedAt: Date,
): ApplyItemChangesResult {
  const nextName = changes.name ?? item.name;
  const nameError = validateItemName(nextName);
  if (nameError !== null) {
    return { ok: false, reason: 'invalid', error: nameError };
  }

  const plannedQuantity =
    changes.plannedQuantity === undefined
      ? item.plannedQuantity
      : changes.plannedQuantity;
  const unit = changes.unit === undefined ? item.unit : changes.unit;
  const plannedPrice =
    changes.plannedPrice === undefined
      ? item.plannedPrice
      : changes.plannedPrice;

  const valueError =
    validateQuantity(plannedQuantity) ??
    validatePrice(plannedPrice) ??
    validateUnit(unit);
  if (valueError !== null) {
    return { ok: false, reason: 'invalid', error: valueError };
  }

  const conflict = findNameConflict(items, nextName, item.id);
  if (conflict !== null) {
    return { ok: false, reason: 'name-conflict', conflictingItemId: conflict.id };
  }

  return {
    ok: true,
    item: {
      ...item,
      name: nextName.trim(),
      nameNormalized: normalizeItemName(nextName),
      plannedQuantity,
      unit,
      plannedPrice,
      updatedAt,
    },
  };
}
