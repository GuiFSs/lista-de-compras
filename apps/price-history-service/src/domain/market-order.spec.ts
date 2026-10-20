import { describe, expect, it } from 'vitest';
import { compareMarketNames } from './market-order';

describe('compareMarketNames (RN-05/CD-04)', () => {
  it('compara pela normalização: caixa e acentos ignorados', () => {
    // Pelo texto cru, `a` (97) viria depois de `B` (66); a normalização decide
    // primeiro e coloca `atacadão` antes.
    expect(compareMarketNames('atacadão', 'Banana')).toBeLessThan(0);
    expect(compareMarketNames('Zaffari', 'atacadão')).toBeGreaterThan(0);
    expect(compareMarketNames('AÇOUGUE', 'acougue')).toBeLessThan(0);
  });

  it('desempata pelo texto cru quando a normalização empata', () => {
    // `Mercado` (M = 77) vem antes de `mercado` (m = 109) por código de ponto.
    expect(compareMarketNames('Mercado', 'mercado')).toBeLessThan(0);
    expect(compareMarketNames('mercado', 'Mercado')).toBeGreaterThan(0);
  });

  it('texto idêntico empata', () => {
    expect(compareMarketNames('Atacadão', 'Atacadão')).toBe(0);
  });

  it('ordena uma lista de mercados de forma determinística', () => {
    const markets = ['Zaffari', 'mercado', 'Atacadão', 'Mercado'];

    expect([...markets].sort(compareMarketNames)).toEqual([
      'Atacadão',
      'Mercado',
      'mercado',
      'Zaffari',
    ]);
  });
});
