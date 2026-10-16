import { expect, test } from '@playwright/test';
import { openShoppingList } from '../support/shopping-list-journey';
import { listRows, storageKeys } from '../support/ui';

test.describe('Lista — concluir compra', () => {
  test('resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Arroz', plannedQuantity: 2, unit: 'unidade' },
        {
          name: 'Leite',
          plannedQuantity: 1,
          unit: 'L',
          purchased: { quantity: 1, unit: 'L', unitPrice: 6.5 },
        },
        {
          name: 'Café',
          plannedQuantity: 1,
          unit: 'pacote',
          purchased: { quantity: 1, unit: 'pacote', unitPrice: 18.5 },
        },
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(3);
    await expect(page.locator('.summary')).toHaveText('1 pendente · 2 comprados');

    // O resumo diz quantos saem e quantos permanecem — antes de qualquer remoção.
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    const dialog = page.getByRole('dialog', { name: 'Concluir compra' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.checkout__line')).toHaveText([
      '2 itens comprados saem da lista.',
      '1 item permanece na lista.',
    ]);
    expect(api.countRequests('POST', '/checkout')).toBe(0);

    // Cancelar o resumo não muda nada: nenhum item sai e nada é enviado.
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(3);
    expect(api.countRequests('POST', '/checkout')).toBe(0);

    // Confirmar: só os comprados saem e a conclusão é confirmada na tela.
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Arroz');
    await expect(page.getByText('Leite')).toHaveCount(0);
    await expect(page.getByText('Café')).toHaveCount(0);
    await expect(page.locator('.summary')).toHaveText('1 pendente · 0 comprados');
    await expect(page.locator('.toast')).toContainText('Compra concluída');
    expect(api.countRequests('POST', '/checkout')).toBe(1);
  });

  test('concluir sem itens comprados mantém a lista exatamente como estava', async ({ page }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Arroz', plannedQuantity: 2, unit: 'unidade' },
        { name: 'Leite', plannedQuantity: 1, unit: 'L', plannedPrice: 6.5 },
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(2);

    await page.getByRole('button', { name: 'Concluir compra' }).click();
    const dialog = page.getByRole('dialog', { name: 'Concluir compra' });
    await expect(dialog).toContainText('Nenhum item está marcado como comprado');
    await expect(dialog.locator('.checkout__line')).toHaveText([
      'Nenhum item sai da lista.',
      '2 itens permanecem na lista.',
    ]);

    // Concluir mesmo assim: nada sai e nada foi registrado no serviço.
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();
    await expect(dialog).toHaveCount(0);
    expect(api.countRequests('POST', '/checkout')).toBe(1);

    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Arroz');
    await expect(rows.nth(1)).toContainText('Leite');
    await expect(rows.nth(1).locator('.item-row__meta')).toHaveText('1 L · R$ 6,50');
    await expect(page.locator('.toast')).toContainText('Compra concluída');

    // Recarregar devolve a mesma lista — a conclusão não deixou rastro.
    await page.reload();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Arroz');
    await expect(rows.nth(1)).toContainText('Leite');
    await expect(rows.nth(1).locator('.item-row__meta')).toHaveText('1 L · R$ 6,50');
  });

  test('o resumo não pede mercado nem data', async ({ page }) => {
    await openShoppingList(page, {
      seeds: [
        { name: 'Arroz', plannedQuantity: 2, unit: 'unidade' },
        {
          name: 'Café',
          plannedQuantity: 1,
          unit: 'pacote',
          purchased: { quantity: 1, unit: 'pacote', unitPrice: 18.5 },
        },
      ],
    });

    await page.getByRole('button', { name: 'Concluir compra' }).click();
    const dialog = page.getByRole('dialog', { name: 'Concluir compra' });
    await expect(dialog).toBeVisible();

    // Nesta rodada a conclusão é só a seleção do que sai: sem campo de mercado
    // nem de data e sem nenhum dado de compra consultável na tela.
    await expect(dialog.locator('input, select, textarea')).toHaveCount(0);
    await expect(dialog.getByText(/mercado/i)).toHaveCount(0);
    await expect(dialog.getByText(/data/i)).toHaveCount(0);
    await expect(dialog.locator('.checkout__actions button')).toHaveText([
      'Cancelar',
      'Concluir compra',
    ]);
  });

  test('adicionar/editar/marcar/excluir e **recarregar a PWA**: estado mantido (GET refeito no serviço; nada em `localStorage`)', async ({
    page,
  }) => {
    const api = await openShoppingList(page);

    const rows = listRows(page);
    await expect(page.getByText('Sua lista está vazia')).toBeVisible();

    // Adicionar o primeiro item.
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('Arroz');
    await page.locator('#item-quantity').fill('2');
    await page.locator('#item-unit').selectOption('unidade');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(rows).toHaveCount(1);

    // Adicionar um segundo item (será excluído no fim).
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('Leite');
    await page.locator('#item-quantity').fill('1');
    await page.locator('#item-unit').selectOption('L');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(rows).toHaveCount(2);

    // Editar os planejados.
    await page.getByRole('button', { name: 'Ações de Leite' }).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#item-name').fill('Leite integral');
    await page.locator('#item-price').fill('650');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(rows.nth(1)).toContainText('Leite integral');
    await expect(rows.nth(1).locator('.item-row__meta')).toHaveText('1 L · R$ 6,50');

    // Marcar como comprado.
    await page.getByRole('button', { name: 'Marcar Leite integral como comprado' }).click();
    await page.locator('#purchase-price').fill('650');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();
    await expect(page.getByRole('button', { name: 'Desmarcar Leite integral' })).toBeVisible();

    // Excluir o outro item.
    await page.getByRole('button', { name: 'Ações de Arroz' }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Leite integral');
    await expect(rows.first().locator('.item-row__name')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    );

    // Nada relevante vive no navegador: só o token da sessão.
    expect(await storageKeys(page)).toEqual(['lcd.accessToken']);

    // Recarregar a PWA refaz o GET e mantém o estado salvo no serviço.
    await page.reload();

    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Leite integral');
    await expect(rows.first().locator('.item-row__meta')).toHaveText('1 L · R$ 6,50');
    await expect(rows.first().locator('.item-row__name')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    );
    await expect(page.getByRole('button', { name: 'Desmarcar Leite integral' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Arroz')).toHaveCount(0);

    // A PWA chama a base direta do serviço com o Bearer do interceptor (ADR 0009).
    const reads = api.requests().filter((request) => request.method === 'GET');
    expect(reads.length).toBeGreaterThan(1);
    expect(reads.every((request) => request.url === 'http://localhost:3000/api/shopping-list')).toBe(
      true,
    );
    expect(reads.every((request) => request.authorization?.startsWith('Bearer ') === true)).toBe(
      true,
    );
  });
});
