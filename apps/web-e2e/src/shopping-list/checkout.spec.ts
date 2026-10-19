import { expect, test } from '@playwright/test';
import { futureLocal, todayLocal } from '../support/dates';
import { openShoppingList } from '../support/shopping-list-journey';
import { listRows, storageKeys } from '../support/ui';

test.describe('Lista — concluir compra (checkout)', () => {
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

    // AC-04/RN-03: Mercado só com espaços não vale — a validação local bloqueia
    // antes de qualquer envio, o erro aparece no campo e o digitado permanece.
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    await dialog.locator('#checkout-market').fill('   ');
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#checkout-market-error')).toHaveText('Mercado é obrigatório');
    await expect(dialog.locator('#checkout-market')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('#checkout-market')).toHaveValue('   ');
    await expect(rows).toHaveCount(3);
    expect(api.countRequests('POST', '/checkout')).toBe(0);

    // AC-03/AC-05: com Mercado válido e a Data já vindo = hoje (RN-04), a
    // conclusão segue — só os comprados saem e o serviço recebe os dois campos.
    await dialog.locator('#checkout-market').fill('Mercado Z');
    await expect(dialog.locator('#checkout-market-error')).toHaveCount(0);
    const today = todayLocal();
    await expect(dialog.locator('#checkout-date')).toHaveValue(today);

    // AC-04/RN-03: data futura é rejeitada no campo (o `novalidate` do form
    // deixa a regra do produto falar), nada é enviado e o digitado permanece.
    const date = dialog.locator('#checkout-date');
    const future = futureLocal(1);
    await date.fill(future);
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#checkout-date-error')).toHaveText(
      'Data da compra não pode ser futura',
    );
    await expect(date).toHaveAttribute('aria-invalid', 'true');
    await expect(date).toHaveValue(future);
    await expect(dialog.locator('#checkout-market')).toHaveValue('Mercado Z');
    await expect(rows).toHaveCount(3);
    expect(api.countRequests('POST', '/checkout')).toBe(0);

    // Corrigir a data limpa o erro e a conclusão acontece.
    await date.fill(today);
    await expect(dialog.locator('#checkout-date-error')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Arroz');
    await expect(page.getByText('Leite')).toHaveCount(0);
    await expect(page.getByText('Café')).toHaveCount(0);
    await expect(page.locator('.summary')).toHaveText('1 pendente · 0 comprados');
    await expect(page.locator('.toast')).toContainText('Compra concluída');
    expect(api.countRequests('POST', '/checkout')).toBe(1);
    const checkouts = api
      .requests()
      .filter((request) => request.method === 'POST' && request.path.endsWith('/checkout'));
    expect(checkouts).toHaveLength(1);
    expect(checkouts[0].body).toEqual({ market: 'Mercado Z', purchaseDate: today });
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
    // RN-09/AC-07: sem comprados o sheet não renderiza Mercado nem Data.
    await expect(dialog.locator('input, select, textarea')).toHaveCount(0);
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

  test('com comprados, o resumo mostra Mercado e Data (hoje pré-preenchido, sem data futura)', async ({
    page,
  }) => {
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

    // AC-03/RN-03: com ≥1 comprado o resumo ganha os campos Mercado* e Data da
    // compra*, com rótulos associados aos inputs.
    const market = dialog.locator('#checkout-market');
    const date = dialog.locator('#checkout-date');
    await expect(market).toBeVisible();
    await expect(dialog.locator('label[for="checkout-market"]')).toContainText('Mercado');
    await expect(date).toBeVisible();
    await expect(dialog.locator('label[for="checkout-date"]')).toContainText('Data da compra');

    // RN-04: Mercado começa vazio; a Data vem com hoje no fuso local, é editável
    // e `max=today` impede data futura.
    const today = todayLocal();
    await expect(market).toHaveValue('');
    await expect(date).toHaveValue(today);
    await expect(date).toHaveAttribute('max', today);

    // AC-19: as ações seguem Cancelar (secondary) + a única `primary` do sheet.
    await expect(dialog.locator('.checkout__actions button')).toHaveText([
      'Cancelar',
      'Concluir compra',
    ]);
    // A confirmação é a única primary visível no sheet (AC-19 "uma primary").
    await expect(dialog.locator('.btn-primary:visible')).toHaveCount(1);
  });

  test('falha de rede ao concluir com mercado/data preenchidos: toast persistente, digitado preservado, lista intacta e nova tentativa funciona (AC-15)', async ({
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
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(2);
    expect(api.countRequests('POST', '/checkout')).toBe(0);

    // Resumo com mercado e data (hoje) **antes** de derrubar a rede: o POST
    // precisa acontecer de verdade, senão a validação local seria a "prova".
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    const dialog = page.getByRole('dialog', { name: 'Concluir compra' });
    const today = todayLocal();
    await dialog.locator('#checkout-market').fill('Mercado Central');
    await expect(dialog.locator('#checkout-date')).toHaveValue(today);

    api.failNext('POST', '/checkout');
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();

    // Erro visível e nenhum item "no fantasma": a lista segue como estava.
    await expect(page.locator('.toast--error')).toContainText('Falha de rede');
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Desmarcar Leite' })).toBeVisible();

    // O sheet permanece aberto e o digitado fica preservado para a nova tentativa.
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#checkout-market')).toHaveValue('Mercado Central');
    expect(api.countRequests('POST', '/checkout')).toBe(1);

    // Nova tentativa (sem falha) conclui: só o comprado sai e o serviço recebeu 1 POST.
    await dialog.getByRole('button', { name: 'Concluir compra' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Arroz');
    await expect(page.getByText('Compra concluída')).toBeVisible();
    expect(api.countRequests('POST', '/checkout')).toBe(2);
  });

  test('duplo toque em Concluir compra: rótulo Concluindo…, CTA desabilitado e uma única requisição (AC-20)', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      // Atraso para o POST seguir em andamento enquanto o 2º toque chega.
      delayMs: 600,
      seeds: [
        { name: 'Arroz', plannedQuantity: 2, unit: 'unidade' },
        {
          name: 'Leite',
          plannedQuantity: 1,
          unit: 'L',
          purchased: { quantity: 1, unit: 'L', unitPrice: 6.5 },
        },
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(2);
    expect(api.countRequests('POST', '/checkout')).toBe(0);

    await page.getByRole('button', { name: 'Concluir compra' }).click();
    const dialog = page.getByRole('dialog', { name: 'Concluir compra' });
    await dialog.locator('#checkout-market').fill('Mercado Central');

    // O duplo toque chega com o 1º envio em andamento: o CTA vira progresso.
    await dialog.getByRole('button', { name: 'Concluir compra' }).dblclick();

    await expect(dialog.getByRole('button', { name: 'Concluindo…' })).toBeDisabled();
    expect(api.countRequests('POST', '/checkout')).toBe(1);

    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Arroz');
    await expect(page.getByText('Compra concluída')).toBeVisible();
    expect(api.countRequests('POST', '/checkout')).toBe(1);
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
