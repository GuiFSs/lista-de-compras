import { expect, test } from '@playwright/test';
import { openShoppingList } from '../support/shopping-list-journey';
import { listRows } from '../support/ui';

test.describe('Lista — duplicidade', () => {
  test('`cafe`/`Café`: pergunta somar; confirmar soma e mantém um item; recusar mantém o form com o digitado', async ({
    page,
  }) => {
    const api = await openShoppingList(page);

    // Cria "Café" com 2 kg.
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('Café');
    await page.locator('#item-quantity').fill('2');
    await page.locator('#item-unit').selectOption('kg');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(listRows(page)).toHaveCount(1);

    // "cafe" difere só por acento/caixa (RN-02): o serviço responde 409 e a PWA
    // pergunta se soma — sem criar um segundo item.
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('cafe');
    await page.locator('#item-quantity').fill('3');
    await page.locator('#item-unit').selectOption('kg');
    await page.getByRole('button', { name: 'Salvar' }).click();

    const duplicateSheet = page.getByRole('dialog', { name: 'Item já existe' });
    await expect(duplicateSheet).toBeVisible();
    await expect(duplicateSheet).toContainText('Café');
    await expect(duplicateSheet).toContainText('Deseja somar a quantidade');
    // O formulário segue aberto com o que foi digitado.
    await expect(page.getByRole('heading', { name: 'Adicionar item' })).toBeVisible();
    await expect(page.locator('#item-name')).toHaveValue('cafe');

    // Confirmar: o serviço soma (2 + 3) e a lista continua com um único item.
    await page.getByRole('button', { name: 'Somar quantidade' }).click();

    const rows = listRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Café');
    await expect(rows.first().locator('.item-row__meta')).toHaveText('5 kg');

    // Três POSTs: o "Café" original, a tentativa "cafe" que o serviço recusou com
    // 409 (AC-07) e o reenvio confirmado com `duplicateResolution`.
    const posts = api.requests().filter((request) => request.method === 'POST');
    expect(posts).toHaveLength(3);
    expect(posts[2].body).toMatchObject({
      name: 'cafe',
      duplicateResolution: 'sum-planned-quantity',
    });

    // Recusar: a lista fica igual e o formulário mantém o digitado para corrigir.
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.locator('#item-name').fill('CAFÉ');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('dialog', { name: 'Item já existe' })).toBeVisible();

    await page.getByRole('button', { name: 'Não somar' }).click();
    await expect(page.getByRole('dialog', { name: 'Item já existe' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Adicionar item' })).toBeVisible();
    await expect(page.locator('#item-name')).toHaveValue('CAFÉ');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.item-row__meta')).toHaveText('5 kg');
    expect(api.requests().filter((request) => request.method === 'POST')).toHaveLength(4);

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { name: 'Adicionar item' })).toHaveCount(0);
  });

  test('editar para um nome existente: conflito visível no formulário, a edição **não** é aplicada e **nada** é somado; renomear para o próprio nome aplica', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Arroz', plannedQuantity: 1, unit: 'pacote' },
        { name: 'Café', plannedQuantity: 2, unit: 'kg' },
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(2);

    // "Arroz" → "cafe" (outro item, mesmo nome normalizado): 409 terminal.
    await page.getByRole('button', { name: 'Ações de Arroz' }).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#item-name').fill('cafe');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByRole('alert')).toContainText('Já existe um item com esse nome');
    // Edição não pergunta somar e não aplica nada (CD-13).
    await expect(page.getByRole('dialog', { name: 'Item já existe' })).toHaveCount(0);
    await expect(rows.nth(0)).toContainText('Arroz');
    await expect(rows.nth(1)).toContainText('Café');
    await expect(rows.nth(1).locator('.item-row__meta')).toHaveText('2 kg');
    expect(api.countRequests('PATCH', '/items/seed-1')).toBe(1);

    // A pessoa corrige o nome e a edição vale.
    await page.locator('#item-name').fill('Arroz parboilizado');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(rows.nth(0)).toContainText('Arroz parboilizado');
    await expect(page.getByRole('alert')).toHaveCount(0);

    // Renomear o próprio item para o próprio nome normalizado não é conflito.
    await page.getByRole('button', { name: 'Ações de Café' }).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#item-name').fill('cafe');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(rows.nth(1)).toContainText('cafe');
    await expect(rows.nth(1).locator('.item-row__meta')).toHaveText('2 kg');
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
