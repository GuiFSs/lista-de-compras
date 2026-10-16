import { describe, expect, it } from 'vitest';
import { validateCheckoutInput } from './checkout-validation';

// UTC fixo: a validação compara contra o calendário UTC do `now` recebido.
const NOW = new Date('2026-10-16T15:00:00.000Z');

describe('validateCheckoutInput (price-history RN-03/RN-04; CD-07)', () => {
  it('aceita mercado e data hoje ou passados, com mercado aparado', () => {
    const today = validateCheckoutInput(
      { market: '  Padaria Central  ', purchaseDate: '2026-10-16' },
      NOW,
    );
    const past = validateCheckoutInput(
      { market: 'Mercado Sul', purchaseDate: '2019-02-28' },
      NOW,
    );

    expect(today).toEqual({
      ok: true,
      market: 'Padaria Central',
      purchaseDate: '2026-10-16',
    });
    expect(past.ok).toBe(true);
  });

  it('recusa mercado vazio, só espaços ou não texto (AC-04)', () => {
    const date = '2026-10-16';

    expect(validateCheckoutInput({ market: '', purchaseDate: date }, NOW)).toEqual(
      { ok: false, error: 'market-required' },
    );
    expect(
      validateCheckoutInput({ market: '   \t ', purchaseDate: date }, NOW),
    ).toEqual({ ok: false, error: 'market-required' });
    expect(validateCheckoutInput({ market: 42, purchaseDate: date }, NOW)).toEqual(
      { ok: false, error: 'market-required' },
    );
  });

  it('recusa data ausente', () => {
    for (const purchaseDate of [undefined, null, '']) {
      const result = validateCheckoutInput(
        { market: 'Mercado Central', purchaseDate },
        NOW,
      );

      expect(result).toEqual({ ok: false, error: 'purchase-date-required' });
    }
  });

  it('recusa data fora do formato YYYY-MM-DD ou impossível no calendário', () => {
    for (const purchaseDate of [
      '16/10/2026',
      '2026-10-16T00:00:00.000Z',
      '2026-10',
      '2026-02-30',
      '2026-13-01',
      20261016,
    ]) {
      const result = validateCheckoutInput(
        { market: 'Mercado Central', purchaseDate },
        NOW,
      );

      expect(result).toEqual({ ok: false, error: 'purchase-date-invalid' });
    }
  });

  it('recusa data futura e aceita a data de hoje (AC-04/CD-07)', () => {
    const future = validateCheckoutInput(
      { market: 'Mercado Central', purchaseDate: '2026-10-17' },
      NOW,
    );
    const farFuture = validateCheckoutInput(
      { market: 'Mercado Central', purchaseDate: '2099-12-31' },
      NOW,
    );
    const today = validateCheckoutInput(
      { market: 'Mercado Central', purchaseDate: '2026-10-16' },
      NOW,
    );

    expect(future).toEqual({ ok: false, error: 'purchase-date-future' });
    expect(farFuture).toEqual({ ok: false, error: 'purchase-date-future' });
    expect(today.ok).toBe(true);
  });

  it('valida mercado antes da data (ordem dos campos do contrato)', () => {
    const result = validateCheckoutInput(
      { market: '  ', purchaseDate: '2099-01-01' },
      NOW,
    );

    expect(result).toEqual({ ok: false, error: 'market-required' });
  });
});
