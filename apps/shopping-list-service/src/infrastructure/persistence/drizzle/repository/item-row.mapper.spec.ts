import { describe, expect, it } from 'vitest';
import type { ShoppingListItemRow } from '../schema';
import {
  toDomainItem,
  toRowValues,
  toUpdateValues,
} from './item-row.mapper';

const CREATED_AT = new Date('2026-10-13T10:00:00.000Z');
const UPDATED_AT = new Date('2026-10-13T11:00:00.000Z');

function pendingRow(
  overrides: Partial<ShoppingListItemRow> = {},
): ShoppingListItemRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Café',
    nameNormalized: 'cafe',
    plannedQuantity: 2,
    unit: 'kg',
    plannedPrice: 25.5,
    purchasedQuantity: null,
    purchasedUnit: null,
    unitPrice: null,
    purchasedAt: null,
    removedAt: null,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

function purchasedRow(): ShoppingListItemRow {
  return pendingRow({
    purchasedQuantity: 1.5,
    purchasedUnit: 'kg',
    unitPrice: 30,
    purchasedAt: UPDATED_AT,
  });
}

describe('toDomainItem', () => {
  it('mapeia item pendente, incluindo opcionais nulos', () => {
    const item = toDomainItem(
      pendingRow({ plannedQuantity: null, unit: null, plannedPrice: null }),
    );

    expect(item).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
      purchased: null,
      removedAt: null,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });
  });

  it('monta os dados da compra quando purchased_at está preenchido', () => {
    const item = toDomainItem(purchasedRow());

    expect(item.purchased).toEqual({
      quantity: 1.5,
      unit: 'kg',
      unitPrice: 30,
      purchasedAt: UPDATED_AT,
    });
  });

  it('rejeita unidade fora das sete do contrato', () => {
    expect(() => toDomainItem(pendingRow({ unit: 'litro' }))).toThrow(
      /unidade inválida/i,
    );
  });

  it('rejeita item comprado com campo obrigatório ausente', () => {
    expect(() =>
      toDomainItem(
        pendingRow({
          purchasedAt: UPDATED_AT,
          purchasedQuantity: null,
          purchasedUnit: 'kg',
          unitPrice: 30,
        }),
      ),
    ).toThrow(/purchased_quantity/);
  });
});

describe('toRowValues', () => {
  it('grava os dados do domínio e zera as colunas de compra quando pendente', () => {
    const values = toRowValues({
      id: 'id-1',
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 25.5,
      purchased: null,
      removedAt: null,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });

    expect(values).toEqual({
      id: 'id-1',
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 25.5,
      purchasedQuantity: null,
      purchasedUnit: null,
      unitPrice: null,
      purchasedAt: null,
      removedAt: null,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });
  });
});

describe('toUpdateValues', () => {
  it('não altera id/createdAt e limpa os dados da compra ao desmarcar', () => {
    const values = toUpdateValues({
      id: 'id-1',
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 25.5,
      purchased: null,
      removedAt: UPDATED_AT,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });

    expect(values).toEqual({
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 25.5,
      purchasedQuantity: null,
      purchasedUnit: null,
      unitPrice: null,
      purchasedAt: null,
      removedAt: UPDATED_AT,
      updatedAt: UPDATED_AT,
    });
  });
});
