import { expect, test } from '@playwright/test';
import { LOWEST_PRICES, PURCHASES } from '../support/price-history-fixtures';
import { openPriceHistory } from '../support/price-history-journey';
import {
  MIN_TOUCH_TARGET,
  boxHeight,
  boxWidth,
  contentRows,
  hasHorizontalOverflow,
  tokenValue,
  usesTokenColor,
} from '../support/ui';

test.describe('Histórico e Menor preço — navegação real e design', () => {
  test('toca Histórico e Menor preço: navega para a rota real, aba ativa e sem "em breve" (AC-01/AC-02)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    const listTab = nav.getByRole('link', { name: 'Lista' });
    const historyTab = nav.getByRole('link', { name: 'Histórico' });
    const pricesTab = nav.getByRole('link', { name: 'Menor preço' });

    // As abas antes desabilitadas com "em breve" agora são rotas reais.
    await expect(nav.getByText('em breve')).toHaveCount(0);
    await expect(listTab).toHaveAttribute('aria-current', 'page');

    // AC-01: tocar Histórico navega para a rota real e a aba fica ativa.
    await historyTab.click();
    await expect(page).toHaveURL(/\/historico$/);
    await expect(historyTab).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Histórico', level: 1 })).toBeVisible();
    await expect(contentRows(page)).toHaveCount(2);

    // AC-02: tocar Menor preço navega e ativa a aba correspondente.
    await pricesTab.click();
    await expect(page).toHaveURL(/\/menor-preco$/);
    await expect(pricesTab).toHaveAttribute('aria-current', 'page');
    await expect(historyTab).not.toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Menor preço', level: 1 })).toBeVisible();
    await expect(contentRows(page)).toHaveCount(2);

    // A aba Lista retoma a tela da lista.
    await listTab.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(listTab).toHaveAttribute('aria-current', 'page');
  });

  test('a PWA chama http://localhost:3002/api/price-history/* com Authorization (AC-21)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/historico', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    const readOf = (path: string) =>
      journey.priceHistory.requests().find((request) => request.path === path);

    // A rota resolve antes do bootstrap Angular disparar o GET: a leitura do
    // registro só é confiável quando o conteúdo pedido já está na tela.
    await expect(contentRows(page)).toHaveCount(2);
    const purchasesRead = readOf('/api/price-history/purchases');
    expect(purchasesRead?.url).toBe('http://localhost:3002/api/price-history/purchases');
    expect(purchasesRead?.authorization?.startsWith('Bearer ')).toBe(true);

    // Detalhe: mesma base, com o id da compra no caminho.
    await contentRows(page).first().getByRole('link').click();
    await expect(page).toHaveURL(/\/historico\/compra-2$/);
    await expect(page.locator('.detail__market')).toHaveText('Mercado Central');
    const detailRead = readOf('/api/price-history/purchases/compra-2');
    expect(detailRead?.url).toBe(
      'http://localhost:3002/api/price-history/purchases/compra-2',
    );
    expect(detailRead?.authorization?.startsWith('Bearer ')).toBe(true);

    // Menor preço: mesma base.
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Menor preço' })
      .click();
    await expect(page).toHaveURL(/\/menor-preco$/);
    await expect(contentRows(page)).toHaveCount(2);
    const lowestRead = readOf('/api/price-history/lowest-prices');
    expect(lowestRead?.url).toBe('http://localhost:3002/api/price-history/lowest-prices');
    expect(lowestRead?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('sessão inválida no histórico: 401 volta ao login com returnUrl (AC-18)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/historico', {
      priceHistory: { unauthorized: true },
    });

    // O interceptor da PWA trata o 401 como sessão encerrada e volta ao login.
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    expect(new URL(page.url()).searchParams.get('returnUrl')).toBe('/historico');
    expect(await page.evaluate(() => localStorage.getItem('lcd.accessToken'))).toBeNull();

    // A chamada que provocou o 401 foi autenticada (Bearer) — não é um 401 "sem token".
    const read = journey.priceHistory
      .requests()
      .find((request) => request.path === '/api/price-history/purchases');
    expect(read?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('viewport ~360px e desktop, tema claro/escuro, uma primary e alvos ≥44px (AC-19)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/historico', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    const historyTab = nav.getByRole('link', { name: 'Histórico' });

    // Mobile 360px: coluna única, sem overflow e a linha-alvo ≥44px.
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(contentRows(page)).toHaveCount(2);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await boxWidth(page.locator('main.container'))).toBeLessThanOrEqual(360);
    expect(await boxHeight(page.locator('.history__link').first())).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    // Com conteúdo na lista não há ação primary sobrando (AC-19 "ou empty state").
    await expect(page.locator('.btn-primary:visible')).toHaveCount(0);
    // A aba ativa é pintada pelo token, não por uma cor literal no teste.
    expect(await usesTokenColor(page, historyTab, '--color-primary-text')).toBe(true);

    // Desktop: coluna única centralizada em `--container-max`.
    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await tokenValue(page, '--container-max')).toBe('960px');
    expect(await boxWidth(page.locator('main.container'))).toBe(960);

    // Tema escuro funcional: canvas e azul de texto vêm dos tokens escuros.
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.getByRole('heading', { name: 'Histórico', level: 1 })).toBeVisible();
    expect(await tokenValue(page, '--color-canvas')).toBe('#191919');
    expect(await tokenValue(page, '--color-primary-text')).toBe('#62aef0');
    expect(await usesTokenColor(page, historyTab, '--color-primary-text')).toBe(true);

    // Menor preço: busca e linhas com alvo ≥44px, ainda em coluna única.
    await nav.getByRole('link', { name: 'Menor preço' }).click();
    await expect(page).toHaveURL(/\/menor-preco$/);
    await expect(contentRows(page)).toHaveCount(2);
    expect(await boxHeight(page.locator('#lowest-price-search'))).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    expect(await boxHeight(page.locator('.prices__item').first())).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await expect(page.locator('.btn-primary:visible')).toHaveCount(0);
  });
});
