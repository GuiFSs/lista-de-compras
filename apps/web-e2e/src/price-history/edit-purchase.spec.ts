import { expect, test } from '@playwright/test';
import type { LowestPriceMarketGroup } from '@lista/contracts';
import type { SeedPurchase } from '../support/price-history-fake-api';
import { openPriceHistory } from '../support/price-history-journey';
import { displayDate } from '../support/dates';

const CHEAP_ID = 'compra-barata';
const OTHER_ID = 'compra-outra';

const cheapPurchase: SeedPurchase = {
  id: CHEAP_ID,
  market: 'Atacadão',
  purchaseDate: '2026-10-01',
  createdAt: '2026-10-01T12:00:00.000Z',
  items: [
    { name: 'Arroz', quantity: 2, unit: 'kg', unitPrice: 8 },
    { name: 'Feijão', quantity: 1, unit: 'pacote', unitPrice: 4 },
  ],
};

const otherPurchase: SeedPurchase = {
  id: OTHER_ID,
  market: 'Feira',
  purchaseDate: '2026-10-10',
  createdAt: '2026-10-10T12:00:00.000Z',
  items: [{ name: 'Arroz', quantity: 1, unit: 'kg', unitPrice: 10 }],
};

const lowestBefore: LowestPriceMarketGroup[] = [
  {
    market: 'Atacadão',
    items: [
      {
        name: 'Arroz',
        nameNormalized: 'arroz',
        lowestUnitPrice: 8,
        market: 'Atacadão',
        purchaseDate: '2026-10-01',
        quantity: 2,
        unit: 'kg',
      },
      {
        name: 'Feijão',
        nameNormalized: 'feijao',
        lowestUnitPrice: 4,
        market: 'Atacadão',
        purchaseDate: '2026-10-01',
        quantity: 1,
        unit: 'pacote',
      },
    ],
  },
];

test.describe('editar compra', () => {
  test('editar compra concluída: o preço que deixa de ser o menor cede a outra compra', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, `/historico/${CHEAP_ID}`, {
      priceHistory: {
        purchases: [otherPurchase, cheapPurchase],
        lowestPrices: lowestBefore,
        lowestPricesByItem: {
          arroz: {
            name: 'Arroz',
            nameNormalized: 'arroz',
            markets: [
              {
                market: 'Atacadão',
                lowestUnitPrice: 8,
                purchaseDate: '2026-10-01',
                quantity: 2,
                unit: 'kg',
              },
              {
                market: 'Feira',
                lowestUnitPrice: 10,
                purchaseDate: '2026-10-10',
                quantity: 1,
                unit: 'kg',
              },
            ],
          },
        },
      },
    });

    await expect(page.locator('.detail__market')).toHaveText('Atacadão');
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('heading', { name: 'Editar compra' })).toBeVisible();
    await expect(page.locator('#edit-market')).toHaveValue('Atacadão');
    await expect(page.locator('#edit-date')).toHaveValue('2026-10-01');
    await expect(page.locator('#edit-line-1-name')).toHaveValue('Arroz');
    await expect(page.locator('#edit-line-1-price')).toHaveValue('R$ 8,00');

    await page.locator('#edit-line-1-price').fill('1200');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Compra atualizada')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/historico/${CHEAP_ID}$`));
    await expect(page.locator('.detail__item').first().locator('.detail__item-meta')).toHaveText(
      '2 kg · R$ 12,00',
    );
    expect(journey.priceHistory.countRequests('PATCH', `/purchases/${CHEAP_ID}`)).toBe(1);
    expect(journey.shoppingList.countRequests('POST')).toBe(0);
    expect(journey.shoppingList.countRequests('PATCH')).toBe(0);

    await page.getByRole('link', { name: 'Menor preço' }).click();
    await expect(page.locator('.prices__name', { hasText: 'Arroz' })).toBeVisible();
    const rice = page.locator('.prices__item', { has: page.locator('.prices__name', { hasText: 'Arroz' }) });
    await expect(rice.locator('.prices__value')).toHaveText('R$ 10,00');
    await expect(rice.locator('.prices__meta')).toHaveText(
      `Feira · ${displayDate('2026-10-10')} · 1 kg`,
    );

    await rice.getByRole('link').click();
    await expect(page).toHaveURL(/\/menor-preco\/arroz$/);
    const markets = page.locator('.markets__line');
    await expect(markets).toHaveCount(2);
    await expect(markets.nth(0).locator('.markets__market')).toHaveText('Atacadão');
    await expect(markets.nth(0).locator('.markets__value')).toHaveText('R$ 12,00');
    await expect(markets.nth(1).locator('.markets__market')).toHaveText('Feira');
    await expect(markets.nth(1).locator('.markets__value')).toHaveText('R$ 10,00');
  });

  test('editar compra concluída: incluir e remover linha; zero itens e nome repetido não salvam', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, `/historico/${CHEAP_ID}`, {
      priceHistory: { purchases: [cheapPurchase], lowestPrices: lowestBefore },
    });

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Remover item' }).nth(1).click();
    await page.getByRole('button', { name: 'Incluir item' }).click();
    await page.locator('#edit-line-3-name').fill('Leite');
    await page.locator('#edit-line-3-qty').fill('1');
    await page.locator('#edit-line-3-unit').selectOption('L');
    await page.locator('#edit-line-3-price').fill('450');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Compra atualizada')).toBeVisible();
    const items = page.locator('.detail__item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0).locator('.detail__item-name')).toHaveText('Arroz');
    await expect(items.nth(1).locator('.detail__item-name')).toHaveText('Leite');
    await expect(items.nth(1).locator('.detail__item-meta')).toHaveText('1 L · R$ 4,50');

    await page.getByRole('link', { name: 'Menor preço' }).click();
    await expect(page.getByText('Feijão')).toHaveCount(0);
    await expect(page.locator('.prices__name', { hasText: 'Leite' })).toBeVisible();

    await page.goto(`/historico/${CHEAP_ID}`);
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Remover item' }).first().click();
    await expect(page.getByRole('button', { name: 'Remover item' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Remover item' }).click();
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await expect(page.getByText('A compra precisa ter pelo menos um item.')).toBeVisible();
    expect(journey.priceHistory.countRequests('PATCH')).toBe(1);

    await page.getByRole('button', { name: 'Incluir item' }).click();
    await page.locator('#edit-line-3-name').fill('Leite');
    await page.locator('#edit-line-3-qty').fill('1');
    await page.locator('#edit-line-3-unit').selectOption('L');
    await page.locator('#edit-line-3-price').fill('100');
    await page.getByRole('button', { name: 'Incluir item' }).click();
    await page.locator('#edit-line-4-name').fill('leite');
    await page.locator('#edit-line-4-qty').fill('2');
    await page.locator('#edit-line-4-unit').selectOption('L');
    await page.locator('#edit-line-4-price').fill('200');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Já existe um item com esse nome nesta compra')).toBeVisible();
    expect(journey.priceHistory.countRequests('PATCH')).toBe(1);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('.detail__item')).toHaveCount(2);
  });

  test('editar compra concluída: mudar a quantidade de quem não vence deixa o menor preço', async ({
    page,
  }) => {
    await openPriceHistory(page, `/historico/${OTHER_ID}`, {
      priceHistory: {
        purchases: [otherPurchase, cheapPurchase],
        lowestPrices: lowestBefore,
      },
    });

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#edit-line-1-qty').fill('9');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('.detail__item-meta')).toHaveText('9 kg · R$ 10,00');

    await page.getByRole('link', { name: 'Menor preço' }).click();
    const rice = page.locator('.prices__item', {
      has: page.locator('.prices__name', { hasText: 'Arroz' }),
    });
    await expect(rice.locator('.prices__value')).toHaveText('R$ 8,00');
    await expect(rice.locator('.prices__meta')).toHaveText(
      `Atacadão · ${displayDate('2026-10-01')} · 2 kg`,
    );
  });

  test('editar compra concluída: mercado vazio e data futura não enviam a edição', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, `/historico/${CHEAP_ID}`, {
      priceHistory: { purchases: [cheapPurchase], lowestPrices: lowestBefore },
    });

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#edit-market').fill('   ');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Mercado é obrigatório')).toBeVisible();

    await page.locator('#edit-market').fill('Padaria');
    await page.locator('#edit-date').fill('2099-01-01');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('A data da compra não pode ser futura')).toBeVisible();
    expect(journey.priceHistory.countRequests('PATCH')).toBe(0);

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('.detail__market')).toHaveText('Atacadão');
  });

  test('editar compra concluída: falha de rede ao salvar preserva o formulário', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, `/historico/${CHEAP_ID}`, {
      priceHistory: { purchases: [cheapPurchase], lowestPrices: lowestBefore },
    });

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#edit-market').fill('Padaria da esquina');
    journey.priceHistory.failNext('PATCH', `/purchases/${CHEAP_ID}`);
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(
      page.getByText('Falha de rede. Verifique a conexão e tente novamente.'),
    ).toBeVisible();
    await expect(page.locator('#edit-market')).toHaveValue('Padaria da esquina');
    await expect(page.getByRole('heading', { name: 'Editar compra' })).toBeVisible();
  });
});
