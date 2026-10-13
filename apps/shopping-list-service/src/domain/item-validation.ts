import { isItemUnit } from './item-unit';
import { isBlankItemName } from './item-name';

/**
 * Códigos de validação do domínio. A borda HTTP traduz cada um na mensagem PT
 * do contrato (T-06) — o domínio não conhece status HTTP.
 */
export type ItemValidationError =
  | 'name-required'
  | 'quantity-not-positive'
  | 'price-negative'
  | 'unit-invalid';

/** Campos de criação/edição. `name` é obrigatório; os demais são opcionais (RN-03). */
export interface ItemFieldsInput {
  name: unknown;
  plannedQuantity?: unknown;
  unit?: unknown;
  plannedPrice?: unknown;
}

/** Dados obrigatórios de marcação como comprado (RN-09). */
export interface PurchaseInput {
  purchasedQuantity: unknown;
  unit: unknown;
  unitPrice: unknown;
}

export function validateItemName(name: unknown): ItemValidationError | null {
  return typeof name === 'string' && !isBlankItemName(name)
    ? null
    : 'name-required';
}

export function validateRequiredQuantity(
  quantity: unknown,
): ItemValidationError | null {
  return typeof quantity === 'number' &&
    Number.isFinite(quantity) &&
    quantity > 0
    ? null
    : 'quantity-not-positive';
}

/** Quantidade opcional: ausente/`null` passa; informada precisa ser finita e > 0 (RN-06). */
export function validateQuantity(
  quantity: unknown,
): ItemValidationError | null {
  if (quantity === null || quantity === undefined) {
    return null;
  }
  return validateRequiredQuantity(quantity);
}

export function validateRequiredPrice(
  price: unknown,
): ItemValidationError | null {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0
    ? null
    : 'price-negative';
}

/** Preço opcional: ausente/`null` passa; informado precisa ser finito e >= 0 (RN-06). */
export function validatePrice(price: unknown): ItemValidationError | null {
  if (price === null || price === undefined) {
    return null;
  }
  return validateRequiredPrice(price);
}

export function validateRequiredUnit(
  unit: unknown,
): ItemValidationError | null {
  return isItemUnit(unit) ? null : 'unit-invalid';
}

/** Unidade opcional: ausente/`null` passa; informada precisa constar em `ITEM_UNITS` (RN-05). */
export function validateUnit(unit: unknown): ItemValidationError | null {
  if (unit === null || unit === undefined) {
    return null;
  }
  return validateRequiredUnit(unit);
}

/** Valida os campos de criar/editar na ordem nome → quantidade → preço → unidade. */
export function validateItemFields(
  fields: ItemFieldsInput,
): ItemValidationError | null {
  return (
    validateItemName(fields.name) ??
    validateQuantity(fields.plannedQuantity) ??
    validatePrice(fields.plannedPrice) ??
    validateUnit(fields.unit)
  );
}

/** Valida os três dados obrigatórios da marcação como comprado (RN-09). */
export function validatePurchaseInput(
  input: PurchaseInput,
): ItemValidationError | null {
  return (
    validateRequiredQuantity(input.purchasedQuantity) ??
    validateRequiredPrice(input.unitPrice) ??
    validateRequiredUnit(input.unit)
  );
}
