import { expect, test } from '@playwright/test';
import { CAFE_PRICES, CAFE_LOWEST, LOWEST_PRICES, PURCHASES, TWO_CAFE_PURCHASES } from '../support/price-history-fixtures';
import { openPriceHistory } from '../support/price-history-journey';
import { contentRows } from '../support/ui';

test.describe('Menor preço — lista, busca e estados', () => {
  test('lista cada item distinto com o MENOR preço por unidade; café/cafe como um único item (AC-08/AC-10)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: TWO_CAFE_PURCHASES, lowestPrices: CAFE_LOWEST },
    });

    // AC-08: dois registros do mesmo café (com e sem acento) → **um** único item.
    await expect(page.locator('.prices__name')).toHaveText(['Café']);
    // AC-10: a tela exibe o **menor** preço já agregado pelo serviço.
    await expect(page.locator('.prices__value')).toHaveText(['R$ 7,50']);
    await expect(
      page.getByText(`R$ ${CAFE_PRICES.highest.toFixed(2).replace('.', ',')}`),
    ).toHaveCount(0);

    // Os dois registros de origem têm preços de verdade diferentes — o menor
    // não é média nem o último preço (AC-10).
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Histórico' }).click();
    await expect(page).toHaveURL(/\/historico$/);
    await expect(contentRows(page)).toHaveCount(2);

    await page.getByRole('link', { name: /28\/09\/2026/ }).click();
    await expect(page.locator('.detail__item-meta')).toHaveText('1 pacote · R$ 10,00');
    await page.getByRole('link', { name: 'Voltar para o histórico' }).click();

    await page.getByRole('link', { name: /10\/10\/2026/ }).click();
    await expect(page.locator('.detail__item-meta')).toHaveText('1 pacote · R$ 7,50');
  });

  test('a lista completa mostra cada item com o menor preço na ordem do serviço (AC-08)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    await expect(page.locator('.summary')).toHaveText('2 itens');
    // Ordem do serviço (RN-07): nome normalizado asc.
    await expect(page.locator('.prices__name')).toHaveText(['Arroz', 'Café']);
    await expect(page.locator('.prices__value')).toHaveText(['R$ 25,90', 'R$ 7,50']);
  });

  test('busca por nome: `cafe` acha `café` (envia o q), sem resultado mostra empty de busca e Limpar busca volta à lista (AC-09)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    const rows = contentRows(page);
    await expect(rows).toHaveCount(2);

    // Busca sem acento encontra o item com acento — o termo vai na query `q`.
    const search = page.locator('#lowest-price-search');
    await search.fill('cafe');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.prices__name')).toHaveText('Café');
    await expect(page.locator('.summary')).toHaveText('1 item para "cafe"');

    const searches = journey.priceHistory
      .requests()
      .filter((request) => request.path === '/api/price-history/lowest-prices');
    expect(searches.some((request) => request.query === 'cafe')).toBe(true);

    // Busca sem resultado: empty de busca (não lista em branco sem explicação).
    await search.fill('xyz');
    await expect(page.locator('.empty--search')).toBeVisible();
    await expect(page.getByText('Nenhum item para "xyz"')).toBeVisible();
    await expect(rows).toHaveCount(0);

    // "Limpar busca" volta à lista completa, sem debounce.
    await page.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(rows).toHaveCount(2);
    await expect(search).toHaveValue('');
  });

  test('primeira carga mostra skeleton na forma das linhas nome+preço (AC-13)', async ({ page }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { lowestPrices: LOWEST_PRICES, delayMs: 1500 },
    });

    const skeleton = page.locator('.prices-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('role', 'status');
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // Forma do conteúdo: uma linha de skeleton por linha de preço.
    await expect(skeleton.locator('.prices-skeleton__row')).toHaveCount(3);
    await expect(page.locator('.spinner')).toHaveCount(0);

    await expect(skeleton).toHaveCount(0);
    await expect(contentRows(page)).toHaveCount(2);
  });

  test('sem preços, o Menor preço mostra empty state rico com uma única primary (AC-12/AC-19)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', { priceHistory: { lowestPrices: [] } });

    await expect(page.locator('.empty--list')).toBeVisible();
    await expect(page.getByText('Nenhum preço registrado ainda')).toBeVisible();
    await expect(page.locator('.empty__sticker')).toBeVisible();

    const cta = page.getByRole('link', { name: 'Ir para a lista' });
    await expect(cta).toHaveClass(/btn-primary/);
    await expect(page.locator('.btn-primary:visible')).toHaveCount(1);

    await cta.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('falha ao carregar os menores preços: erro visível e Tentar novamente refaz o GET (AC-14)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: { lowestPrices: LOWEST_PRICES },
    });
    await expect(contentRows(page)).toHaveCount(2);

    journey.priceHistory.setLoadFailure(true);
    await page.reload();

    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar os menores preços');
    await expect(errorArea).toContainText('Falha de rede');
    await expect(contentRows(page)).toHaveCount(0);

    journey.priceHistory.setLoadFailure(false);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(contentRows(page)).toHaveCount(2);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('falha na busca: Tentar novamente repete a MESMA busca, não a lista completa (AC-14)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: { lowestPrices: LOWEST_PRICES },
    });
    await expect(contentRows(page)).toHaveCount(2);

    // A carga inicial passa; a falha é da busca por `cafe`.
    journey.priceHistory.failNext('GET', '/lowest-prices');
    await page.locator('#lowest-price-search').fill('cafe');

    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar os menores preços');
    await expect(errorArea).toContainText('Falha de rede');

    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(contentRows(page)).toHaveCount(1);
    await expect(contentRows(page).first().locator('.prices__name')).toHaveText('Café');

    // 1 falha + 1 retry, ambos com a query `cafe` preservada.
    const searches = journey.priceHistory
      .requests()
      .filter(
        (request) =>
          request.path === '/api/price-history/lowest-prices' && request.query === 'cafe',
      );
    expect(searches.length).toBe(2);
  });
});
