import { expect, test } from '@playwright/test';
import { ITEM_UNITS } from '@lista/contracts';
import { openShoppingList } from '../support/shopping-list-journey';
import { listRows, waitMs } from '../support/ui';

test.describe('Lista — itens', () => {
  test('adiciona item só com o nome: aparece pendente com opcionais vazios', async ({ page }) => {
    const api = await openShoppingList(page);

    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('Banana');
    await page.getByRole('button', { name: 'Salvar' }).click();

    const rows = listRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Banana');
    // Sem planejados não há metadados e o item segue pendente (não riscado).
    await expect(rows.first().locator('.item-row__meta')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Marcar Banana como comprado' })).toBeVisible();
    await expect(page.locator('.toast')).toContainText('Item adicionado');

    // O payload da criação carrega os opcionais nulos — a ausência não impede criar.
    const posts = api.requests().filter((request) => request.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0].path).toBe('/api/shopping-list/items');
    expect(posts[0].body).toEqual({
      name: 'Banana',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
    });
  });

  test('salvar sem nome/só com espaços: erro no campo e nenhuma requisição', async ({ page }) => {
    const api = await openShoppingList(page);

    await page.getByRole('button', { name: 'Adicionar item' }).click();
    const name = page.locator('#item-name');

    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('alert')).toContainText('Informe o nome do item.');
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    await name.fill('   ');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('alert')).toContainText('Informe o nome do item.');

    // Nada foi criado e nenhuma requisição de criação saiu.
    expect(api.countRequests('POST', '/items')).toBe(0);
    await expect(listRows(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Adicionar item' })).toBeVisible();
  });

  test('unidade oferece exatamente as 7 opções, sem digitação livre (item e compra)', async ({
    page,
  }) => {
    await openShoppingList(page, { seeds: [{ name: 'Arroz' }] });
    const units = [...ITEM_UNITS];

    // Formulário do item (adicionar/editar).
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await expect(page.locator('#item-unit')).toHaveJSProperty('tagName', 'SELECT');
    await expect(page.locator('#item-unit option')).toHaveText(units);
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Formulário de marcar como comprado.
    await page.getByRole('button', { name: 'Marcar Arroz como comprado' }).click();
    await expect(page.locator('#purchase-unit')).toHaveJSProperty('tagName', 'SELECT');
    await expect(page.locator('#purchase-unit option')).toHaveText(units);
  });

  test('editar planejados e salvar atualiza a linha', async ({ page }) => {
    await openShoppingList(page, {
      seeds: [{ name: 'Arroz', plannedQuantity: 1, unit: 'pacote' }],
    });

    await page.getByRole('button', { name: 'Ações de Arroz' }).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#item-name').fill('Arroz integral');
    await page.locator('#item-quantity').fill('3');
    await page.locator('#item-unit').selectOption('kg');
    await page.locator('#item-price').fill('12,50');
    await page.getByRole('button', { name: 'Salvar' }).click();

    const row = listRows(page);
    await expect(row).toHaveCount(1);
    await expect(row.first()).toContainText('Arroz integral');
    await expect(row.first().locator('.item-row__meta')).toHaveText('3 kg · R$ 12,50');
    await expect(page.locator('.toast')).toContainText('Item atualizado');
  });

  test('falha de rede ao salvar/marcar/concluir: toast persistente, digitado preservado, sem estado fantasma', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [{ name: 'Arroz', plannedQuantity: 2, unit: 'unidade' }],
    });

    // Falha ao salvar: nada entra na lista e o formulário guarda o digitado.
    api.failNext('POST', '/items');
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('Banana');
    await page.getByRole('button', { name: 'Salvar' }).click();

    const errorToast = page.locator('.toast--error').last();
    await expect(errorToast).toContainText('Falha de rede');
    await expect(page.locator('#item-name')).toHaveValue('Banana');
    await expect(page.getByRole('heading', { name: 'Adicionar item' })).toBeVisible();
    // Sem estado fantasma: a lista relida do serviço tem só o item real.
    const rows = listRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Arroz');
    await expect
      .poll(() => api.countRequests('GET', '/api/shopping-list'))
      .toBeGreaterThan(1);

    // O toast de erro não some sozinho (≠ confirmação de ≈4s) e só sai pelo
    // descarte (AC-23).
    await waitMs(4500);
    await expect(errorToast).toBeVisible();
    await errorToast.getByRole('button', { name: 'Dispensar' }).click();
    await expect(page.locator('.toast--error')).toHaveCount(0);

    // Nova tentativa é possível e conclui de verdade.
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Banana');
    // A confirmação some sozinha (≈4s) e deixa de cobrir os botões do rodapé.
    await expect(page.locator('.toast')).toHaveCount(0);

    // Falha ao editar: a linha fica com os dados do serviço, não com o digitado.
    api.failNext('PATCH', '/items/seed-1');
    await page.getByRole('button', { name: 'Ações de Arroz' }).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#item-name').fill('Arroz que não salvou');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(errorToast).toContainText('Falha de rede');
    await expect(page.locator('#item-name')).toHaveValue('Arroz que não salvou');
    await expect(rows.first()).toContainText('Arroz');
    await expect(page.getByText('Arroz que não salvou')).toHaveCount(0);
    await errorToast.getByRole('button', { name: 'Dispensar' }).click();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Falha ao concluir: nada sai da lista.
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    api.failNext('POST', '/checkout');
    await page
      .getByRole('dialog', { name: 'Concluir compra' })
      .getByRole('button', { name: 'Concluir compra' })
      .click();

    await expect(errorToast).toContainText('Falha de rede');
    await expect(rows).toHaveCount(2);
  });

  test('duplo toque no Salvar: rótulo `Salvando…`, botão desabilitado e **1** requisição', async ({
    page,
  }) => {
    const api = await openShoppingList(page, { delayMs: 800 });

    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('Leite');

    const save = page.getByRole('button', { name: 'Salvar' });
    // Duplo toque no próprio alvo: o segundo toque acontece com o botão já
    // desabilitado e não gera uma segunda requisição.
    await save.dblclick();
    await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    await expect(listRows(page)).toHaveCount(1);
    // O single-flight do store + o botão desabilitado seguram o segundo toque.
    expect(api.countRequests('POST', '/items')).toBe(1);
  });
});
