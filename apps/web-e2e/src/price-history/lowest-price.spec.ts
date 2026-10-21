import { expect, test } from '@playwright/test';
import {
  CAFE_LOWEST,
  CAFE_PRICES,
  EMPATE_LOWEST,
  LOWEST_PRICES,
  PURCHASES,
  SEARCH_LOWEST,
  TWO_CAFE_PURCHASES,
} from '../support/price-history-fixtures';
import { openPriceHistory } from '../support/price-history-journey';
import { contentRows } from '../support/ui';

test.describe('Menor preço — lista, busca e estados', () => {
  test('lista agrupada: cada linha traz o menor preço por unidade e mercado · data · quantidade com a unidade da compra vencedora (AC-01/AC-03)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: TWO_CAFE_PURCHASES, lowestPrices: CAFE_LOWEST },
    });

    // AC-03: dois registros do mesmo café (com e sem acento) → **um** único item,
    // no grupo do mercado da compra vencedora (Feira do bairro) e com o **menor**
    // preço já agregado pelo serviço (R$ 7,50), não a média nem o último preço.
    const groups = page.locator('.market');
    await expect(groups).toHaveCount(1);
    await expect(groups.first().locator('.market__title')).toHaveText('Feira do bairro');

    const rows = contentRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.prices__name')).toHaveText('Café');
    await expect(rows.first().locator('.prices__value')).toHaveText('R$ 7,50');
    // AC-01/CD-08: metadados da compra vencedora, com a unidade (não o total).
    await expect(rows.first().locator('.prices__meta')).toHaveText(
      'Feira do bairro · 10/10/2026 · 1 pacote',
    );
    await expect(
      page.getByText(`R$ ${CAFE_PRICES.highest.toFixed(2).replace('.', ',')}`),
    ).toHaveCount(0);
  });

  test('mercados A→Z (caixa/acentos ignorados) e itens A→Z dentro do grupo; item de vários mercados aparece uma vez; mercado sem item vencedor não gera cabeçalho (AC-02/CD-09)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    await expect(page.locator('.summary')).toHaveText('2 itens');

    // CD-09: nenhum grupo sem item vira cabeçalho; e os títulos são exatamente os
    // grupos com ao menos um item, em ordem A→Z (Feira do bairro < Mercado Central).
    const titles = page.locator('.market__title');
    await expect(titles).toHaveText(['Feira do bairro', 'Mercado Central']);

    // Itens no grupo do mercado correto e em A→Z por nome normalizado.
    const groups = page.locator('.market');
    await expect(groups.nth(0).locator('.prices__name')).toHaveText(['Café']);
    await expect(groups.nth(1).locator('.prices__name')).toHaveText(['Arroz']);
    await expect(groups.nth(1).locator('.prices__meta')).toHaveText(
      'Mercado Central · 17/10/2026 · 2 unidade',
    );
  });

  test('empate de preço credita a compra mais recente; recarregar a tela mantém o mesmo grupo e os mesmos mercado/data/quantidade (AC-04)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: PURCHASES, lowestPrices: EMPATE_LOWEST },
    });

    const row = contentRows(page).first();
    await expect(row.locator('.prices__name')).toHaveText('Tomate');
    await expect(row.locator('.prices__value')).toHaveText('R$ 4,99');
    // A compra mais recente (17/10) credita mercado/data/quantidade; a de 01/10
    // não aparece em nenhum lugar.
    await expect(row.locator('.prices__meta')).toHaveText(
      'Mercado Central · 17/10/2026 · 3 kg',
    );

    // Determinismo entre cargas: recarregar repete o mesmo grupo e metadados.
    await page.reload();
    await expect(page.locator('.market__title')).toHaveText(['Mercado Central']);
    await expect(contentRows(page).first().locator('.prices__meta')).toHaveText(
      'Mercado Central · 17/10/2026 · 3 kg',
    );
  });

  test('busca `cafe` acha `café` e mantém o agrupamento; busca sem resultado mostra o empty de busca com Limpar busca (AC-09)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: PURCHASES, lowestPrices: SEARCH_LOWEST },
    });

    const rows = contentRows(page);
    await expect(rows).toHaveCount(3);

    // Busca sem acento encontra o item com acento — o termo vai na query `q`.
    const search = page.locator('#lowest-price-search');
    await search.fill('cafe');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.prices__name')).toHaveText('Café');
    // O resultado filtrado mantém o agrupamento (só o grupo com item que casa).
    await expect(page.locator('.market__title')).toHaveText(['Feira do bairro']);
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
    await expect(rows).toHaveCount(3);
    await expect(search).toHaveValue('');
  });

  test('primeira carga mostra skeleton na forma dos grupos (AC-13)', async ({ page }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: { lowestPrices: LOWEST_PRICES, delayMs: 1500 },
    });

    const skeleton = page.locator('.prices-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('role', 'status');
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // Forma do conteúdo: grupos com cabeçalho de mercado + linhas de preço.
    await expect(skeleton.locator('.prices-skeleton__group')).toHaveCount(2);
    await expect(skeleton.locator('.prices-skeleton__header')).toHaveCount(2);
    await expect(skeleton.locator('.prices-skeleton__row')).toHaveCount(4);
    await expect(page.locator('.spinner')).toHaveCount(0);

    await expect(skeleton).toHaveCount(0);
    await expect(contentRows(page)).toHaveCount(2);
  });

  test('sem preços, o Menor preço mostra empty state rico com uma única primary (AC-10/AC-16)', async ({
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
      priceHistory: { lowestPrices: SEARCH_LOWEST },
    });
    await expect(contentRows(page)).toHaveCount(3);

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

  test('entrar na tela pela aba Menor preço repete a última busca em vez de recarregar a lista completa (CD-10/AC-11)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: { purchases: PURCHASES, lowestPrices: SEARCH_LOWEST },
    });
    await expect(contentRows(page)).toHaveCount(3);

    // Filtra por `cafe` e sai para outra aba.
    await page.locator('#lowest-price-search').fill('cafe');
    await expect(contentRows(page)).toHaveCount(1);
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Histórico' }).click();
    await expect(page).toHaveURL(/\/historico$/);

    const searchesBefore = journey.priceHistory
      .requests()
      .filter((request) => request.path === '/api/price-history/lowest-prices').length;

    // Volta pela aba: a tela sincroniza o campo com o store e repete a MESMA
    // busca (não a lista completa), preservando o termo e a lista filtrada.
    await nav.getByRole('link', { name: 'Menor preço' }).click();
    await expect(page).toHaveURL(/\/menor-preco$/);
    await expect(page.locator('#lowest-price-search')).toHaveValue('cafe');
    await expect(contentRows(page)).toHaveCount(1);
    await expect(contentRows(page).first().locator('.prices__name')).toHaveText('Café');

    const lastSearch = journey.priceHistory
      .requests()
      .filter((request) => request.path === '/api/price-history/lowest-prices')
      .at(-1);
    expect(lastSearch?.query).toBe('cafe');
    expect(
      journey.priceHistory
        .requests()
        .filter((request) => request.path === '/api/price-history/lowest-prices').length,
    ).toBe(searchesBefore + 1);
  });
});
