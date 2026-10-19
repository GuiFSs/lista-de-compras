/// <reference types="node" />
// Fumaça de tokens do GUIA-DESIGN (RN-14/AC-19) para a superfície nova da
// feature Histórico de preços: telas de Histórico/detalhe/Menor preço, sheet de
// conclusão da Lista e bottom nav só podem pintar com tokens — cor hardcoded
// (`#hex`, `rgb()`, `hsl()`) em `.scss` ou template é regressão.
//
// Diferente dos specs de componente (que checam DOM/estrutura), este lê os
// arquivos do disco: é o guard que o PLAN pede ("teste de fumaça que leia os
// arquivos e barra hex/`rgb(` hardcoded fora dos tokens").
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = dirname(fileURLToPath(import.meta.url));
const PRICE_HISTORY_DIR = join(APP_DIR, 'features', 'price-history');

/** Cor literal — só `styles/_tokens.scss` pode ter (hex, `rgb[a](`, `hsl[a](`). */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

/**
 * Arquivos da superfície nova: todos os estilos/templates da feature + o sheet
 * do checkout (T-17) + a bottom nav (T-16). São os pontos onde uma cor
 * hardcoded furaria o AC-19.
 */
function surfacedFiles(): string[] {
  const feature = readdirSync(PRICE_HISTORY_DIR)
    .filter((name) => name.endsWith('.scss') || name.endsWith('.html'))
    .map((name) => join(PRICE_HISTORY_DIR, name));

  return [
    ...feature,
    join(APP_DIR, 'features', 'shopping-list', 'checkout-sheet.scss'),
    join(APP_DIR, 'features', 'shopping-list', 'checkout-sheet.html'),
    join(APP_DIR, 'layout', 'bottom-nav', 'bottom-nav.scss'),
    join(APP_DIR, 'layout', 'bottom-nav', 'bottom-nav.html'),
  ];
}

describe('design tokens — superfície nova (RN-14/AC-19)', () => {
  it('encontra os arquivos da superfície: o guard não pode passar vazio', () => {
    const files = surfacedFiles();

    // 6 da feature (3 telas × scss+html) + checkout (scss+html) + nav (scss+html).
    expect(files.length).toBeGreaterThanOrEqual(10);
    files.forEach((file) => expect(existsSync(file), `arquivo ausente: ${file}`).toBe(true));
  });

  it.each(surfacedFiles())('%s não hardcoda cor — só `var(--*)`', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(COLOR_LITERAL);
  });

  it('o guard não é vácuo: os tokens são o lugar das cores literais', () => {
    const tokens = readFileSync(join(APP_DIR, '..', 'styles', '_tokens.scss'), 'utf8');

    expect(tokens).toMatch(COLOR_LITERAL);
  });
});
