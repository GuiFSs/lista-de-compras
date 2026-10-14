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
 * Linhas da lista ativa. O `main` isola a lista do bottom nav, que também tem
 * `listitem` (Lista/Histórico/Menor preço) e contaminaria a contagem.
 */
export function listRows(page: Page): Locator {
  return page.getByRole('main').getByRole('listitem');
}
