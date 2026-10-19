import { expect, test } from '@playwright/test';
import { displayDate, todayLocal } from '../support/dates';
import {
  LOWEST_PRICES,
  PURCHASES,
  completedPurchase,
} from '../support/price-history-fixtures';
import { openPriceHistory } from '../support/price-history-journey';
import { MIN_TOUCH_TARGET, boxHeight, contentRows } from '../support/ui';

test.describe('Histórico — lista, detalhe e estados', () => {
  test('lista as compras (mais recente primeiro) com data/mercado e abre o detalhe com os itens (AC-06/AC-11)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/historico', {
      priceHistory: { purchases: PURCHASES, lowestPrices: LOWEST_PRICES },
    });

    const rows = contentRows(page);
    await expect(rows).toHaveCount(2);
    await expect(page.locator('.summary')).toHaveText('2 compras');

    // Ordem do serviço (RN-08): a compra mais recente primeiro.
    await expect(rows.nth(0).locator('.history__date')).toHaveText(displayDate('2026-10-17'));
    await expect(rows.nth(0).locator('.history__meta')).toHaveText('Mercado Central · 2 itens');
    await expect(rows.nth(1).locator('.history__date')).toHaveText(displayDate('2026-10-10'));
    await expect(rows.nth(1).locator('.history__meta')).toHaveText('Feira do bairro · 1 item');

    // AC-11: a linha inteira abre o detalhe com data, mercado e itens comprados.
    await rows.first().getByRole('link').click();
    await expect(page).toHaveURL(/\/historico\/compra-2$/);
    await expect(page.getByRole('heading', { name: 'Compra', level: 1 })).toBeVisible();
    await expect(page.locator('.detail__market')).toHaveText('Mercado Central');
    await expect(page.locator('.detail__date')).toHaveText(displayDate('2026-10-17'));

    const items = page.locator('.detail__item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0).locator('.detail__item-name')).toHaveText('Arroz');
    await expect(items.nth(0).locator('.detail__item-meta')).toHaveText('2 unidade · R$ 25,90');
    await expect(items.nth(1).locator('.detail__item-name')).toHaveText('Feijão');
    await expect(items.nth(1).locator('.detail__item-meta')).toHaveText('1 pacote · R$ 8,40');

    // Voltar retorna à lista do histórico.
    await page.getByRole('link', { name: 'Voltar para o histórico' }).click();
    await expect(page).toHaveURL(/\/historico$/);
    await expect(rows).toHaveCount(2);
  });

  test('após o consumo do evento, a compra aparece no Histórico com a mesma data e mercado (AC-06)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/', {
      priceHistory: { purchases: [], lowestPrices: LOWEST_PRICES },
      shoppingList: {
        seeds: [
          { name: 'Arroz', plannedQuantity: 2, unit: 'unidade' },
          { name: 'Leite', purchased: { quantity: 1, unit: 'L', unitPrice: 6.5 } },
        ],
      },
    });

    const today = todayLocal();

    // Conclui a compra na Lista: só o comprado sai e o serviço recebe mercado/data.
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    const sheet = page.getByRole('dialog', { name: 'Concluir compra' });
    await sheet.locator('#checkout-market').fill('Mercado Central');
    await sheet.getByRole('button', { name: 'Concluir compra' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('Compra concluída');

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    const historyTab = nav.getByRole('link', { name: 'Histórico' });

    // CD-06: até o consumo, o histórico ainda pode não refletir a compra.
    await historyTab.click();
    await expect(page).toHaveURL(/\/historico$/);
    await expect(page.getByText('Nenhuma compra ainda')).toBeVisible();

    // Consumo do evento (o broker em si é provado na integração dos serviços).
    journey.priceHistory.addPurchase(
      completedPurchase('completion-1', 'Mercado Central', today),
    );

    // Nova entrada na tela refaz o GET (RN-01) e a compra aparece.
    await page.getByRole('link', { name: 'Ir para a lista' }).click();
    await expect(page).toHaveURL(/\/$/);
    await historyTab.click();
    await expect(page).toHaveURL(/\/historico$/);

    const rows = contentRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.history__date')).toHaveText(displayDate(today));
    await expect(rows.first().locator('.history__meta')).toHaveText('Mercado Central · 1 item');

    // O detalhe lista todos os itens que estavam comprados (nome/qtd/unidade/preço).
    await rows.first().getByRole('link').click();
    await expect(page.locator('.detail__market')).toHaveText('Mercado Central');
    await expect(page.locator('.detail__item-name')).toHaveText('Leite');
    await expect(page.locator('.detail__item-meta')).toHaveText('1 L · R$ 6,50');
  });

  test('primeira carga mostra skeleton na forma do conteúdo, nunca spinner sozinho (AC-13)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/historico', {
      priceHistory: { purchases: PURCHASES, delayMs: 1500 },
    });

    const skeleton = page.locator('.history-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('role', 'status');
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // Forma do conteúdo: uma linha de skeleton por linha do histórico.
    await expect(skeleton.locator('.history-skeleton__row')).toHaveCount(3);
    await expect(page.locator('.spinner')).toHaveCount(0);

    // Depois da carga, a lista substitui o skeleton.
    await expect(skeleton).toHaveCount(0);
    await expect(contentRows(page)).toHaveCount(2);
  });

  test('sem compras, o Histórico mostra empty state rico com uma única primary (AC-12/AC-19)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/historico', { priceHistory: { purchases: [] } });

    await expect(page.getByText('Nenhuma compra ainda')).toBeVisible();
    await expect(
      page.getByText('Ao concluir uma compra na Lista, ela aparece aqui com data e mercado.'),
    ).toBeVisible();
    await expect(page.locator('.empty__sticker')).toBeVisible();

    const cta = page.getByRole('link', { name: 'Ir para a lista' });
    await expect(cta).toHaveClass(/btn-primary/);
    await expect(page.locator('.btn-primary:visible')).toHaveCount(1);
    expect(await boxHeight(cta)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);

    await cta.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('falha ao carregar o Histórico: erro visível e Tentar novamente refaz o GET (AC-14)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/historico', {
      priceHistory: { purchases: PURCHASES },
    });
    await expect(contentRows(page)).toHaveCount(2);

    journey.priceHistory.setLoadFailure(true);
    await page.reload();

    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar o histórico');
    await expect(errorArea).toContainText('Falha de rede');
    await expect(contentRows(page)).toHaveCount(0);

    journey.priceHistory.setLoadFailure(false);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(contentRows(page)).toHaveCount(2);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('falha ao carregar o detalhe: Tentar novamente repete a MESMA compra (AC-14)', async ({
    page,
  }) => {
    const journey = await openPriceHistory(page, '/historico', {
      priceHistory: { purchases: PURCHASES },
    });

    journey.priceHistory.failNext('GET', '/purchases/compra-2');
    await contentRows(page).first().getByRole('link').click();

    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar a compra');
    await expect(errorArea).toContainText('Falha de rede');
    // O voltar continua visível no estado de erro.
    await expect(page.getByRole('link', { name: 'Voltar para o histórico' })).toBeVisible();

    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.locator('.detail__market')).toHaveText('Mercado Central');

    // A nova tentativa buscou de verdade a mesma compra (1 falha + 1 retry).
    expect(journey.priceHistory.countRequests('GET', '/purchases/compra-2')).toBe(2);
  });

  test('detalhe de compra inexistente: 404 vira erro com volta ao Histórico (AC-14)', async ({
    page,
  }) => {
    await openPriceHistory(page, '/historico/nao-existe', {
      priceHistory: { purchases: PURCHASES },
    });

    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar a compra');
    await expect(errorArea).toContainText('Compra não encontrada');

    await page.getByRole('link', { name: 'Voltar para o histórico' }).click();
    await expect(page).toHaveURL(/\/historico$/);
    await expect(contentRows(page)).toHaveCount(2);
  });
});
