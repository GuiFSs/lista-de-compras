import { describe, expect, it } from 'vitest';
import { validateIngestPayload } from './ingest-validation';

const COMPLETION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function validPayload() {
  return {
    completionId: COMPLETION_ID,
    market: '  Padaria Central  ',
    purchaseDate: '2026-10-10',
    items: [
      { name: '  Café ', quantity: 2, unit: 'kg', unitPrice: 19.9 },
      { name: 'Arroz', quantity: 1, unit: 'pacote', unitPrice: 8.5 },
    ],
  };
}

describe('validateIngestPayload (RN-05; ingest do evento v1)', () => {
  it('aceita payload válido, aparando mercado e nomes de item', () => {
    const result = validateIngestPayload(validPayload());

    expect(result).toEqual({
      ok: true,
      payload: {
        completionId: COMPLETION_ID,
        market: 'Padaria Central',
        purchaseDate: '2026-10-10',
        items: [
          { name: 'Café', quantity: 2, unit: 'kg', unitPrice: 19.9 },
          { name: 'Arroz', quantity: 1, unit: 'pacote', unitPrice: 8.5 },
        ],
      },
    });
  });

  it('aceita preço zero (item promocional sem custo por unidade)', () => {
    const payload = validPayload();
    payload.items[0].unitPrice = 0;

    expect(validateIngestPayload(payload).ok).toBe(true);
  });

  it('recusa completionId que não seja UUID', () => {
    for (const completionId of [
      undefined,
      null,
      42,
      '',
      'not-a-uuid',
      '7c9e6679742540de944be07fc1f90ae7',
    ]) {
      const result = validateIngestPayload({
        ...validPayload(),
        completionId,
      });

      expect(result).toEqual({ ok: false, error: 'completion-id-invalid' });
    }
  });

  it('recusa mercado vazio, só espaços ou não texto', () => {
    for (const market of [undefined, null, '', '   \t ', 42]) {
      const result = validateIngestPayload({ ...validPayload(), market });

      expect(result).toEqual({ ok: false, error: 'market-required' });
    }
  });

  it('recusa data ausente, com formato errado ou dia inexistente', () => {
    const absent = validateIngestPayload({
      ...validPayload(),
      purchaseDate: undefined,
    });
    expect(absent).toEqual({ ok: false, error: 'purchase-date-required' });

    for (const purchaseDate of ['10/10/2026', '2026-13-01', '2026-02-30']) {
      const result = validateIngestPayload({
        ...validPayload(),
        purchaseDate,
      });

      expect(result).toEqual({ ok: false, error: 'purchase-date-invalid' });
    }
  });

  it('recusa lista de itens ausente ou vazia', () => {
    const absent = validateIngestPayload({ ...validPayload(), items: undefined });
    expect(absent).toEqual({ ok: false, error: 'items-empty' });

    const empty = validateIngestPayload({ ...validPayload(), items: [] });
    expect(empty).toEqual({ ok: false, error: 'items-empty' });
  });

  it('recusa item com nome em branco ou não textual', () => {
    for (const name of [undefined, null, '', '   ', 42]) {
      const result = validateIngestPayload({
        ...validPayload(),
        items: [{ name, quantity: 1, unit: 'kg', unitPrice: 1 }],
      });

      expect(result).toEqual({ ok: false, error: 'item-name-required' });
    }
  });

  it('recusa quantidade não positiva ou não numérica', () => {
    for (const quantity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, '2']) {
      const result = validateIngestPayload({
        ...validPayload(),
        items: [{ name: 'Café', quantity, unit: 'kg', unitPrice: 1 }],
      });

      expect(result).toEqual({
        ok: false,
        error: 'item-quantity-not-positive',
      });
    }
  });

  it('recusa preço negativo ou não numérico (zero passa)', () => {
    for (const unitPrice of [
      -0.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '19,90',
    ]) {
      const result = validateIngestPayload({
        ...validPayload(),
        items: [{ name: 'Café', quantity: 1, unit: 'kg', unitPrice }],
      });

      expect(result).toEqual({ ok: false, error: 'item-price-negative' });
    }
  });

  it('recusa unidade fora de ITEM_UNITS', () => {
    for (const unit of ['tonelada', '', 42, undefined]) {
      const result = validateIngestPayload({
        ...validPayload(),
        items: [{ name: 'Café', quantity: 1, unit, unitPrice: 1 }],
      });

      expect(result).toEqual({ ok: false, error: 'item-unit-invalid' });
    }
  });

  it('reporta o primeiro erro na ordem dos campos', () => {
    const result = validateIngestPayload({
      completionId: 'x',
      market: '',
      purchaseDate: 'não é data',
      items: 'não é lista',
    });

    expect(result).toEqual({ ok: false, error: 'completion-id-invalid' });
  });
});
