// Medidas e toques reais usados pelas jornadas de UI (AC-25/AC-26). Ficam no
// suporte porque as regras do plugin Playwright proíbem laços/condicionais
// dentro do corpo do teste e `force: true`. Os callbacks de `page.evaluate`
// rodam no navegador, então este arquivo usa os tipos do DOM.
/// <reference lib="dom" />
import type { Locator, Page } from '@playwright/test';

/** Alvo de toque mínimo do guia §5 — espelha `--touch-target-min`. */
export const MIN_TOUCH_TARGET = 44;

/** Espera real em milissegundos (janela de ≈4s do toast/Desfazer). */
export async function waitMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Altura renderizada; 0 quando o elemento não tem caixa. */
export async function boxHeight(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return box?.height ?? 0;
}

/** Largura renderizada; 0 quando o elemento não tem caixa. */
export async function boxWidth(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return box?.width ?? 0;
}

/** Mostra a caixa do elemento ou falha — sem `force`, o alvo precisa existir. */
async function requireBox(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('Alvo sem caixa na tela');
  return box;
}

/**
 * Toque real no centro do alvo. Usado em botões desabilitados: o navegador não
 * dispara `click` neles, então a prova é que nada acontece (AC-01).
 */
export async function tapCenter(page: Page, locator: Locator): Promise<void> {
  const box = await requireBox(locator);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Valor computado de um design token no `:root`. */
export async function tokenValue(page: Page, token: string): Promise<string> {
  return page.evaluate(
    (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    token,
  );
}

/** Hex de token (`#abc`/`#aabbcc`) → `rgb(r, g, b)`, o formato computado pelo DOM. */
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * O elemento está pintado com a cor do token informado? Compara o `color`
 * computado (DOM sempre devolve `rgb(...)`) com o hex do token de design — a
 * prova fica contra o token, não contra uma cor literal repetida no teste.
 */
export async function usesTokenColor(
  page: Page,
  locator: Locator,
  token: string,
): Promise<boolean> {
  const expected = hexToRgb(await tokenValue(page, token));
  const computed = await locator.evaluate((element) => getComputedStyle(element).color);
  return computed === expected;
}

/** O elemento em foco tem anel visível do reset (`:focus-visible`)? */
export async function hasVisibleFocusRing(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || !element.matches(':focus-visible')) return false;
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
  });
}

/** A tela transborda na horizontal no viewport atual? */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

/** Chaves gravadas no navegador (a lista não pode viver aqui — AC-24). */
export async function storageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(localStorage));
}

/**
 * Linhas de qualquer lista de conteúdo dentro do `main`. O `main` isola a
 * lista da bottom nav, que também tem `listitem` (Lista/Histórico/Menor preço)
 * e contaminaria a contagem. Vale para a lista de compras, o histórico, os
 * menores preços e os itens do detalhe.
 */
export function contentRows(page: Page): Locator {
  return page.getByRole('main').getByRole('listitem');
}

/** Linhas da lista de compras — o caso mais usado no suporte. */
export function listRows(page: Page): Locator {
  return contentRows(page);
}
