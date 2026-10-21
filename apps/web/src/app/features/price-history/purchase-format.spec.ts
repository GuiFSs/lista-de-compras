import {
  formatPurchaseDate,
  formatQuantity,
  formatQuantityWithUnit,
  formatUnitPrice,
} from './purchase-format';

describe('purchase-format', () => {
  it('formata a data de calendário do serviço em DD/MM/AAAA', () => {
    expect(formatPurchaseDate('2026-10-15')).toBe('15/10/2026');
    expect(formatPurchaseDate('2026-01-02')).toBe('02/01/2026');
  });

  it('devolve a entrada intacta quando não é `YYYY-MM-DD`', () => {
    expect(formatPurchaseDate('15/10/2026')).toBe('15/10/2026');
    expect(formatPurchaseDate('')).toBe('');
  });

  it('usa vírgula decimal na quantidade e centavos no preço em R$', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(1.5)).toBe('1,5');
    expect(formatUnitPrice(7.5)).toBe('R$ 7,50');
    expect(formatUnitPrice(21.9)).toBe('R$ 21,90');
  });

  it('mostra a quantidade com a unidade do serviço (CD-08)', () => {
    expect(formatQuantityWithUnit(2, 'kg')).toBe('2 kg');
    expect(formatQuantityWithUnit(3, 'unidade')).toBe('3 unidade');
    expect(formatQuantityWithUnit(1.5, 'L')).toBe('1,5 L');
  });
});
