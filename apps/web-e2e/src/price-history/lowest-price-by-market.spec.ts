import { expect, test } from '@playwright/test';
import {
  ARROZ_BY_MARKET,
  CAFE_BY_MARKET,
  CAFE_ITEM_PARAM,
  LEITE_ACUCAR_BY_MARKET,
  LEITE_ACUCAR_LOWEST,
  LEITE_ACUCAR_NAME_NORMALIZED,
  LEITE_ACUCAR_RAW_URL_SEGMENT,
  LEITE_ACUCAR_URL_SEGMENT,
  PURCHASES,
  SEARCH_LOWEST,
  TOMATE_BY_MARKET,
} from '../support/price-history-fixtures';
import { openPriceHistory } from '../support/price-history-journey';
import { MIN_TOUCH_TARGET, boxHeight, contentRows } from '../support/ui';

/**
 * Caminhos percent-encoded do drill-down, como o navegador os envia na URL
 * (`URL.pathname` preserva o `%`). `cafe`/`leite%2Facucar` vêm do link da lista
 * (`encodeURIComponent(nameNormalized)`); `caf%C3%A9`/`leite%2Fa%C3%A7%C3%BAcar`
 * vêm de uma URL com o **nome cru** (o serviço normaliza o parâmetro — R-1/R-2).
 */
const CAFE_ITEM_PATH = `/api/price-history/lowest-prices/${encodeURIComponent(CAFE_ITEM_PARAM)}`;
const CAFE_RAW_ITEM_PATH = `/api/price-history/lowest-prices/${encodeURIComponent('café')}`;
const LEITE_ACUCAR_ITEM_PATH = `/api/price-history/lowest-prices/${LEITE_ACUCAR_URL_SEGMENT}`;
const LEITE_ACUCAR_RAW_ITEM_PATH = `/api/price-history/lowest-prices/${LEITE_ACUCAR_RAW_URL_SEGMENT}`;

test.describe('Menor preço por mercado — drill-down do item', () => {
  test('tocar a linha navega para /menor-preco/cafe (segmento = nameNormalized percent-encoded), resolve "Café" e mostra app bar + voltar em todos os estados (AC-05)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: {
        purchases: PURCHASES,
        lowestPrices: SEARCH_LOWEST,
        lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET },
      },
    });

    // Toca a linha do café (o grupo Feira do bairro tem 1 item). O `href` é o
    // `nameNormalized` percent-encoded — para `Café` o normalizado é `cafe`.
    const cafeRow = contentRows(page).filter({ hasText: 'Café' }).first();
    await expect(cafeRow.getByRole('link')).toHaveAttribute('href', '/menor-preco/cafe');
    await cafeRow.getByRole('link').click();

    await expect(page).toHaveURL(/\/menor-preco\/cafe$/);
    // A app bar acompanha o nome de exibição canônico vindo do serviço.
    await expect(page.getByRole('heading', { name: 'Café', level: 1 })).toBeVisible();
    // O voltar tem `aria-label` visível no estado de sucesso (e em todos os outros).
    await expect(
      page.getByRole('link', { name: 'Voltar para os menores preços' }),
    ).toBeVisible();
  });

  test('abrir /menor-preco/caf%C3%A9 (nome cru acentuado) resolve o item — a borda normaliza o parâmetro (R-1)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco/caf%C3%A9', {
      priceHistory: { lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET } },
    });

    // AC-05: a tela resolve o item correto mesmo com acento no parâmetro da URL.
    await expect(page.getByRole('heading', { name: 'Café', level: 1 })).toBeVisible();
    await expect(page.locator('.markets__line')).toHaveCount(3);

    // A chamada saiu com o parâmetro percent-encoded e autenticada.
    const read = journey.priceHistory
      .requests()
      .find((request) => request.path === CAFE_RAW_ITEM_PATH);
    expect(read?.url).toBe('http://localhost:3002/api/price-history/lowest-prices/caf%C3%A9');
    expect(read?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('item em 3 mercados: 3 linhas A→Z, cada uma com o menor preço por unidade, data e quantidade com a unidade daquele mercado (AC-06)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco/cafe', {
      priceHistory: { lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET } },
    });

    const lines = page.locator('.markets__line');
    await expect(lines).toHaveCount(3);
    // Ordem A→Z do serviço: a tela só renderiza a ordem recebida (RN-06/RN-12).
    await expect(lines.locator('.markets__market')).toHaveText([
      'Atacadão',
      'Feira do bairro',
      'Mercado Central',
    ]);
    await expect(lines.locator('.markets__value')).toHaveText([
      'R$ 6,50',
      'R$ 7,50',
      'R$ 9,20',
    ]);
    await expect(lines.locator('.markets__meta')).toHaveText([
      '01/10/2026 · 1 pacote',
      '10/10/2026 · 1 pacote',
      '17/10/2026 · 2 pacote',
    ]);
    await expect(page.locator('.detail__date')).toHaveText('3 mercados');
  });

  test('duas compras no mesmo mercado: a linha daquele mercado mostra o MENOR (R$ 6,00) com a data/quantidade dele (AC-07)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco/tomate', {
      priceHistory: { lowestPricesByItem: { tomate: TOMATE_BY_MARKET } },
    });

    const lines = page.locator('.markets__line');
    await expect(lines).toHaveCount(1);
    await expect(lines.first().locator('.markets__market')).toHaveText('Mercado Central');
    await expect(lines.first().locator('.markets__value')).toHaveText('R$ 6,00');
    await expect(lines.first().locator('.markets__meta')).toHaveText('15/10/2026 · 2 kg');
  });

  test('item de um único mercado aparece normalmente na lista e a tela do item mostra uma única linha (AC-08)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: {
        purchases: PURCHASES,
        lowestPrices: SEARCH_LOWEST,
        lowestPricesByItem: { arroz: ARROZ_BY_MARKET },
      },
    });

    // Na lista, o arroz está no grupo do seu único mercado, com os metadados.
    const arrozRow = contentRows(page).filter({ hasText: 'Arroz' }).first();
    await expect(arrozRow.locator('.prices__meta')).toHaveText(
      'Mercado Central · 17/10/2026 · 2 unidade',
    );

    await arrozRow.getByRole('link').click();
    await expect(page).toHaveURL(/\/menor-preco\/arroz$/);
    const lines = page.locator('.markets__line');
    await expect(lines).toHaveCount(1);
    await expect(lines.first().locator('.markets__market')).toHaveText('Mercado Central');
    await expect(page.locator('.detail__date')).toHaveText('1 mercado');
  });

  test('voltar do item preserva o termo de busca e a lista filtrada (CD-10/AC-11)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: {
        purchases: PURCHASES,
        lowestPrices: SEARCH_LOWEST,
        lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET },
      },
    });

    // Filtra por `cafe` (1 grupo, 1 item) e abre o item.
    await page.locator('#lowest-price-search').fill('cafe');
    await expect(contentRows(page)).toHaveCount(1);
    await contentRows(page).first().getByRole('link').click();
    await expect(page).toHaveURL(/\/menor-preco\/cafe$/);
    await expect(page.locator('.markets__line')).toHaveCount(3);

    // Voltar: a tela Menor preço volta com o termo e a lista filtrada intactos.
    await page.getByRole('link', { name: 'Voltar para os menores preços' }).click();
    await expect(page).toHaveURL(/\/menor-preco$/);
    await expect(page.locator('#lowest-price-search')).toHaveValue('cafe');
    await expect(contentRows(page)).toHaveCount(1);
    await expect(page.locator('.market__title')).toHaveText(['Feira do bairro']);

    // A lista foi refeita com a MESMA busca (não a lista completa).
    const lastSearch = journey.priceHistory
      .requests()
      .filter((request) => request.path === '/api/price-history/lowest-prices')
      .at(-1);
    expect(lastSearch?.query).toBe('cafe');
  });

  test('entrar de novo pela aba Menor preço depois de abrir o item também preserva a busca (CD-10/AC-11)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco', {
      priceHistory: {
        purchases: PURCHASES,
        lowestPrices: SEARCH_LOWEST,
        lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET },
      },
    });

    await page.locator('#lowest-price-search').fill('cafe');
    await expect(contentRows(page)).toHaveCount(1);
    await contentRows(page).first().getByRole('link').click();
    await expect(page).toHaveURL(/\/menor-preco\/cafe$/);

    // Sai do drill-down pela aba Histórico e volta pela aba Menor preço.
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Histórico' }).click();
    await expect(page).toHaveURL(/\/historico$/);
    await nav.getByRole('link', { name: 'Menor preço' }).click();
    await expect(page).toHaveURL(/\/menor-preco$/);

    await expect(page.locator('#lowest-price-search')).toHaveValue('cafe');
    await expect(contentRows(page)).toHaveCount(1);
    await expect(page.locator('.market__title')).toHaveText(['Feira do bairro']);
  });

  test('item com "/" no nome: link percent-encoded e round-trip de ponta a ponta do nome cru (R-2)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: {
        purchases: PURCHASES,
        lowestPrices: LEITE_ACUCAR_LOWEST,
        lowestPricesByItem: { [LEITE_ACUCAR_NAME_NORMALIZED]: LEITE_ACUCAR_BY_MARKET },
      },
    });

    // O link da lista carrega `encodeURIComponent(nameNormalized)` — a barra vira
    // `%2F`, um único segmento.
    const link = contentRows(page).first().getByRole('link');
    await expect(link).toHaveAttribute('href', `/menor-preco/${LEITE_ACUCAR_URL_SEGMENT}`);

    // Toca: o roteador resolve por segmento e o serviço devolve o item — o
    // round-trip não cai em 404.
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/menor-preco/${LEITE_ACUCAR_URL_SEGMENT}$`));
    await expect(
      page.getByRole('heading', { name: 'Leite/Açúcar', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.markets__line')).toHaveCount(1);
    await expect(page.locator('.markets__market')).toHaveText('Mercado Central');

    const viaLink = journey.priceHistory
      .requests()
      .find((request) => request.path === LEITE_ACUCAR_ITEM_PATH);
    expect(viaLink?.url).toBe(
      `http://localhost:3002/api/price-history/lowest-prices/${LEITE_ACUCAR_URL_SEGMENT}`,
    );
    expect(viaLink?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('abrir /menor-preco/leite%2Fa%C3%A7%C3%BAcar (nome cru) resolve o item — a barra não divide o caminho (R-2)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(
      page,
      `/menor-preco/${LEITE_ACUCAR_RAW_URL_SEGMENT}`,
      {
        priceHistory: {
          lowestPricesByItem: { [LEITE_ACUCAR_NAME_NORMALIZED]: LEITE_ACUCAR_BY_MARKET },
        },
      },
    );

    // Prova definitiva de R-2: `%2F` é um segmento só (não uma sub-rota), o nome
    // cru acentuado chega inteiro e a tela resolve o item — nada de 404.
    await expect(
      page.getByRole('heading', { name: 'Leite/Açúcar', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.markets__line')).toHaveCount(1);
    await expect(page.locator('.empty--not-found')).toHaveCount(0);

    const read = journey.priceHistory
      .requests()
      .find((request) => request.path === LEITE_ACUCAR_RAW_ITEM_PATH);
    expect(read?.url).toBe(
      `http://localhost:3002/api/price-history/lowest-prices/${LEITE_ACUCAR_RAW_URL_SEGMENT}`,
    );
    expect(read?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('abrir /menor-preco/item-inexistente mostra o bloco de não encontrado com voltar — nunca erro+retry (AC-12/R-5)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco/item-inexistente', {
      priceHistory: { lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET } },
    });

    // R-5: o 404 vira o bloco de **não encontrado**, não o erro com retry.
    await expect(page.locator('.empty--not-found')).toBeVisible();
    await expect(page.getByText('Nenhum preço por mercado encontrado')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(0);

    // O voltar do bloco de não encontrado (CTA próprio) continua visível e
    // devolve ao Menor preço. O `page-back` da app bar tem o mesmo nome acessível.
    await expect(page.locator('.page-back')).toBeVisible();
    await page.locator('.empty__cta').click();
    await expect(page).toHaveURL(/\/menor-preco$/);
  });

  test('primeira carga do item mostra skeleton e Tentar novamente refaz a MESMA consulta do item (AC-13/AC-14)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco/cafe', {
      priceHistory: {
        lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET },
        delayMs: 1500,
      },
    });

    const skeleton = page.locator('.detail-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('role', 'status');
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // O voltar é visível já no estado de carregamento.
    await expect(
      page.getByRole('link', { name: 'Voltar para os menores preços' }),
    ).toBeVisible();
    await expect(page.locator('.spinner')).toHaveCount(0);

    await expect(skeleton).toHaveCount(0);
    await expect(page.locator('.markets__line')).toHaveCount(3);

    // Falha de carga do item: erro visível e Tentar novamente repete o MESMO item.
    const beforeFailure = journey.priceHistory.countRequests('GET', '/lowest-prices/cafe');
    journey.priceHistory.setLoadFailure(true);
    await page.reload();
    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar os preços por mercado');
    await expect(errorArea).toContainText('Falha de rede');

    journey.priceHistory.setLoadFailure(false);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.locator('.markets__line')).toHaveCount(3);

    // Duas novas chamadas ao MESMO item: a que falhou e o retry, ambas com o
    // segmento `cafe` preservado (AC-13/AC-14).
    expect(journey.priceHistory.countRequests('GET', '/lowest-prices/cafe')).toBe(
      beforeFailure + 2,
    );
  });

  test('a PWA chama http://localhost:3002/api/price-history/lowest-prices/{item} com o segmento percent-encoded e Authorization (ADR 0011)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco', {
      priceHistory: {
        purchases: PURCHASES,
        lowestPrices: SEARCH_LOWEST,
        lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET },
      },
    });

    await contentRows(page).filter({ hasText: 'Café' }).first().getByRole('link').click();
    await expect(page).toHaveURL(/\/menor-preco\/cafe$/);
    await expect(page.locator('.markets__line')).toHaveCount(3);

    const read = journey.priceHistory
      .requests()
      .find((request) => request.path === CAFE_ITEM_PATH);
    expect(read?.url).toBe('http://localhost:3002/api/price-history/lowest-prices/cafe');
    expect(read?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('sessão inválida na tela do item: 401 volta ao login com returnUrl (AC-15)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/menor-preco/cafe', {
      priceHistory: {
        lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET },
        unauthorized: true,
      },
    });

    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    expect(new URL(page.url()).searchParams.get('returnUrl')).toBe('/menor-preco/cafe');
    expect(await page.evaluate(() => localStorage.getItem('lcd.accessToken'))).toBeNull();

    // A chamada que provocou o 401 levou Bearer (não foi um 401 "sem token").
    const read = journey.priceHistory
      .requests()
      .find((request) => request.path === CAFE_ITEM_PATH);
    expect(read?.authorization?.startsWith('Bearer ')).toBe(true);
  });

  test('a tela do item em 360px: linhas ≥44px, sem primary concorrente e voltar acessível (AC-16)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/menor-preco/cafe', {
      priceHistory: { lowestPricesByItem: { [CAFE_ITEM_PARAM]: CAFE_BY_MARKET } },
    });

    await expect(page.locator('.markets__line')).toHaveCount(3);
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await boxHeight(page.locator('.markets__line').first())).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    // Sem CTA primary concorrente: o voltar é a navegação principal.
    await expect(page.locator('.btn-primary:visible')).toHaveCount(0);
  });
});
