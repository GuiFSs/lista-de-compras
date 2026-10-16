import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { DuplicateResolution, ItemUnit } from '@lista/contracts';
import type {
  CreateShoppingListItemCommand,
  MarkItemPurchasedCommand,
  UpdateShoppingListItemCommand,
} from '../../../application';
import { isItemUnit } from '../../../domain/item-unit';
import {
  validateItemFields,
  validateItemName,
  validatePrice,
  validateQuantity,
  validateRequiredPrice,
  validateRequiredQuantity,
  validateRequiredUnit,
  validateUnit,
} from '../../../domain/item-validation';
import type { ItemValidationError } from '../../../domain/item-validation';
import { canonicalError } from './shopping-list-errors';
import { messageForValidationError } from './shopping-list-messages';

/**
 * Validação defensiva dos corpos de entrada: o serviço aceita requisição direta
 * (AC-09), então nada do formato do JSON é presumido antes de validar.
 */

export function parseCreateItemCommand(
  body: unknown,
): CreateShoppingListItemCommand {
  const raw = readBody(body);
  const error = validateItemFields({
    name: raw['name'],
    plannedQuantity: raw['plannedQuantity'],
    unit: raw['unit'],
    plannedPrice: raw['plannedPrice'],
  });
  if (error !== null) {
    throw badRequest(error);
  }
  return {
    name: requireString(raw['name'], 'name-required'),
    plannedQuantity: optionalNumber(raw['plannedQuantity']),
    unit: optionalUnit(raw['unit']),
    plannedPrice: optionalNumber(raw['plannedPrice']),
    duplicateResolution: readDuplicateResolution(raw['duplicateResolution']),
  };
}

export function parseUpdateItemCommand(
  body: unknown,
  id: string,
): UpdateShoppingListItemCommand {
  const raw = readBody(body);
  if (raw['name'] !== undefined) {
    const nameError = validateItemName(raw['name']);
    if (nameError !== null) {
      throw badRequest(nameError);
    }
  }
  const error =
    validateQuantity(raw['plannedQuantity']) ??
    validatePrice(raw['plannedPrice']) ??
    validateUnit(raw['unit']);
  if (error !== null) {
    throw badRequest(error);
  }
  return {
    id,
    // `undefined` = manter o nome; `null` não é aceito no nome (só campos opcionais).
    name:
      raw['name'] === undefined
        ? undefined
        : requireString(raw['name'], 'name-required'),
    plannedQuantity: optionalNumber(raw['plannedQuantity']),
    unit: optionalUnit(raw['unit']),
    plannedPrice: optionalNumber(raw['plannedPrice']),
  };
}

export function parseMarkPurchasedCommand(
  body: unknown,
  id: string,
): MarkItemPurchasedCommand {
  const raw = readBody(body);
  const error =
    validateRequiredQuantity(raw['purchasedQuantity']) ??
    validateRequiredPrice(raw['unitPrice']) ??
    validateRequiredUnit(raw['unit']);
  if (error !== null) {
    throw badRequest(error);
  }
  return {
    id,
    purchasedQuantity: requireNumber(raw['purchasedQuantity'], 'quantity-not-positive'),
    unit: requireUnit(raw['unit']),
    unitPrice: requireNumber(raw['unitPrice'], 'price-negative'),
  };
}

/** Corpo ausente/JSON não-objeto vira `{}`: as validações acima decidem o 400. */
function readBody(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

/** `'sum-planned-quantity'` soma; qualquer outro valor (ou ausente) é `'reject'`. */
function readDuplicateResolution(value: unknown): DuplicateResolution {
  return value === 'sum-planned-quantity' ? 'sum-planned-quantity' : 'reject';
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return typeof value === 'number' ? value : undefined;
}

function optionalUnit(value: unknown): ItemUnit | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return isItemUnit(value) ? value : undefined;
}

function requireString(value: unknown, error: ItemValidationError): string {
  if (typeof value !== 'string') {
    throw badRequest(error);
  }
  return value;
}

function requireNumber(value: unknown, error: ItemValidationError): number {
  if (typeof value !== 'number') {
    throw badRequest(error);
  }
  return value;
}

function requireUnit(value: unknown): ItemUnit {
  if (!isItemUnit(value)) {
    throw badRequest('unit-invalid');
  }
  return value;
}

function badRequest(error: ItemValidationError): BadRequestException {
  return new BadRequestException(
    canonicalError(HttpStatus.BAD_REQUEST, messageForValidationError(error)),
  );
}
