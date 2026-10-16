import { describe, expect, it } from 'vitest';
import { ITEM_UNITS } from '@lista/contracts';
import { isItemUnit } from './item-unit';
import { validateItemFields, validatePurchaseInput } from './item-validation';

describe('isItemUnit (RN-05/AC-06)', () => {
  it('aceita exatamente as sete unidades de ITEM_UNITS', () => {
    expect(ITEM_UNITS).toHaveLength(7);
    for (const unit of ITEM_UNITS) {
      expect(isItemUnit(unit)).toBe(true);
    }
  });

  it('recusa unidade fora da lista e valores não-string', () => {
    expect(isItemUnit('litro')).toBe(false);
    expect(isItemUnit('KG')).toBe(false);
    expect(isItemUnit(null)).toBe(false);
    expect(isItemUnit(1)).toBe(false);
  });
});

describe('validateItemFields (RN-02/RN-06)', () => {
  it('aceita item só com nome válido (opcionais ausentes)', () => {
    expect(
      validateItemFields({
        name: 'Café',
        plannedQuantity: undefined,
        unit: undefined,
        plannedPrice: undefined,
      }),
    ).toBeNull();
  });

  it('exige nome não vazio', () => {
    expect(validateItemFields({ name: '' })).toBe('name-required');
    expect(validateItemFields({ name: '   ' })).toBe('name-required');
    expect(validateItemFields({ name: undefined })).toBe('name-required');
  });

  it('recusa quantidade 0 ou negativa quando informada', () => {
    expect(validateItemFields({ name: 'Arroz', plannedQuantity: 0 })).toBe(
      'quantity-not-positive',
    );
    expect(validateItemFields({ name: 'Arroz', plannedQuantity: -1 })).toBe(
      'quantity-not-positive',
    );
    expect(validateItemFields({ name: 'Arroz', plannedQuantity: 2.5 })).toBeNull();
  });

  it('recusa preço negativo quando informado', () => {
    expect(validateItemFields({ name: 'Arroz', plannedPrice: -0.01 })).toBe(
      'price-negative',
    );
    expect(validateItemFields({ name: 'Arroz', plannedPrice: 0 })).toBeNull();
    expect(validateItemFields({ name: 'Arroz', plannedPrice: 12.9 })).toBeNull();
  });

  it('recusa unidade fora da lista quando informada', () => {
    expect(validateItemFields({ name: 'Arroz', unit: 'litro' })).toBe(
      'unit-invalid',
    );
    expect(validateItemFields({ name: 'Arroz', unit: 'kg' })).toBeNull();
    expect(validateItemFields({ name: 'Arroz', unit: null })).toBeNull();
  });
});

describe('validatePurchaseInput (RN-09)', () => {
  it('aceita os três dados válidos', () => {
    expect(
      validatePurchaseInput({
        purchasedQuantity: 1,
        unit: 'kg',
        unitPrice: 0,
      }),
    ).toBeNull();
  });

  it('exige quantidade comprada > 0', () => {
    expect(
      validatePurchaseInput({ purchasedQuantity: 0, unit: 'kg', unitPrice: 1 }),
    ).toBe('quantity-not-positive');
    expect(
      validatePurchaseInput({ purchasedQuantity: undefined, unit: 'kg', unitPrice: 1 }),
    ).toBe('quantity-not-positive');
  });

  it('exige preço por unidade não negativo', () => {
    expect(
      validatePurchaseInput({
        purchasedQuantity: 1,
        unit: 'kg',
        unitPrice: -1,
      }),
    ).toBe('price-negative');
    expect(
      validatePurchaseInput({
        purchasedQuantity: 1,
        unit: 'kg',
        unitPrice: undefined,
      }),
    ).toBe('price-negative');
  });

  it('exige unidade da lista', () => {
    expect(
      validatePurchaseInput({
        purchasedQuantity: 1,
        unit: undefined,
        unitPrice: 1,
      }),
    ).toBe('unit-invalid');
    expect(
      validatePurchaseInput({
        purchasedQuantity: 1,
        unit: 'litro',
        unitPrice: 1,
      }),
    ).toBe('unit-invalid');
  });
});
