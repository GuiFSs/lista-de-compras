import { expect, test } from '@playwright/test';
import { openShoppingList } from '../support/shopping-list-journey';
import { MIN_TOUCH_TARGET, boxHeight, listRows, waitMs } from '../support/ui';

test.describe('Lista — compra', () => {
  test('marcar com os 3 campos: item comprado com `line-through` e alvo ≥44px, **continua na lista**', async ({
    page,
  }) => {
    await openShoppingList(page, { seeds: [{ name: 'Banana' }] });

    await page.getByRole('button', { name: 'Marcar Banana como comprado' }).click();
    await page.locator('#purchase-quantity').fill('2');
    await page.locator('#purchase-unit').selectOption('kg');
    await page.locator('#purchase-price').fill('5,50');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();

    const row = listRows(page);
    await expect(row).toHaveCount(1);
    await expect(row.first().locator('.item-row__name')).toHaveText('Banana');
    await expect(row.first().locator('.item-row__name')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    );
    await expect(row.first().locator('.item-row__meta')).toHaveText('2 kg · R$ 5,50');
    await expect(page.locator('.toast')).toContainText('Item marcado como comprado');

    // Continua na lista ativa e o alvo de desmarcar mantém ≥44px.
    const toggle = page.getByRole('button', { name: 'Desmarcar Banana' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await boxHeight(toggle)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  test('sem um dos campos obrigatórios: erro no campo e nenhuma requisição de marcação', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [{ name: 'Banana', plannedQuantity: 2, unit: 'kg' }],
    });

    await page.getByRole('button', { name: 'Marcar Banana como comprado' }).click();
    // O preço por unidade começa vazio (RN-13); preenchido aqui para que só a
    // quantidade fique inválida e o alerta possa ser lido pelo id do campo.
    await page.locator('#purchase-price').fill('5,50');
    await page.locator('#purchase-quantity').fill('');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();

    await expect(page.locator('#purchase-quantity-error')).toContainText(
      'Informe a quantidade comprada.',
    );
    await expect(page.locator('#purchase-quantity')).toHaveAttribute('aria-invalid', 'true');
    expect(api.countRequests('PUT', '/purchase')).toBe(0);
    // O item não foi marcado.
    await expect(page.locator('.item-row__name')).toHaveCSS('text-decoration-line', 'none');
  });

  test('quantidade diferente avisa e só marca após confirmar; sem quantidade planejada não avisa', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Leite', plannedQuantity: 3, unit: 'unidade' },
        { name: 'Sal' },
      ],
    });

    // Planejado 3, informado 5 ⇒ aviso e nada marcado antes de confirmar.
    await page.getByRole('button', { name: 'Marcar Leite como comprado' }).click();
    await page.locator('#purchase-quantity').fill('5');
    await page.locator('#purchase-price').fill('4,00');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();

    const warning = page.getByRole('dialog', { name: 'Quantidade diferente' });
    await expect(warning).toContainText('Você informou 5 unidade');
    await expect(warning).toContainText('o planejado era 3 unidade');
    expect(api.countRequests('PUT', '/purchase')).toBe(0);

    // Voltar preserva os campos; a segunda tentativa confirma a marcação.
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator('#purchase-quantity')).toHaveValue('5');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('button', { name: 'Desmarcar Leite' })).toBeVisible();

    // Sem quantidade planejada, nenhum aviso: a marcação segue o fluxo normal.
    await page.getByRole('button', { name: 'Marcar Sal como comprado' }).click();
    await page.locator('#purchase-quantity').fill('1');
    await page.locator('#purchase-unit').selectOption('pacote');
    await page.locator('#purchase-price').fill('2,30');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();

    await expect(page.getByRole('dialog', { name: 'Quantidade diferente' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desmarcar Sal' })).toBeVisible();
    expect(api.countRequests('PUT', '/purchase')).toBe(2);
  });

  test('pré-preenche quantidade/unidade planejadas e deixa o preço por unidade vazio', async ({
    page,
  }) => {
    await openShoppingList(page, {
      seeds: [{ name: 'Arroz', plannedQuantity: 2.5, unit: 'kg', plannedPrice: 31.9 }],
    });

    await page.getByRole('button', { name: 'Marcar Arroz como comprado' }).click();

    await expect(page.locator('#purchase-quantity')).toHaveValue('2,5');
    await expect(page.locator('#purchase-unit')).toHaveValue('kg');
    // O planejado é referência, não o pago (RN-13).
    await expect(page.locator('#purchase-price')).toHaveValue('');
  });

  test('desmarcar volta a pendente e reabrir preserva os digitados; recarregar usa o prefill de AC-15', async ({
    page,
  }) => {
    await openShoppingList(page, {
      seeds: [{ name: 'Arroz', plannedQuantity: 2, unit: 'unidade' }],
    });

    await page.getByRole('button', { name: 'Marcar Arroz como comprado' }).click();
    await page.locator('#purchase-price').fill('7,25');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();
    await expect(page.getByRole('button', { name: 'Desmarcar Arroz' })).toBeVisible();

    // Desmarcar: volta a pendente (dados da compra somem do serviço).
    await page.getByRole('button', { name: 'Desmarcar Arroz' }).click();
    await expect(page.getByRole('button', { name: 'Marcar Arroz como comprado' })).toBeVisible();
    await expect(page.locator('.item-row__name')).toHaveCSS('text-decoration-line', 'none');

    // Reabrir na mesma sessão da tela devolve o que foi digitado (RN-12).
    await page.getByRole('button', { name: 'Marcar Arroz como comprado' }).click();
    await expect(page.locator('#purchase-quantity')).toHaveValue('2');
    await expect(page.locator('#purchase-unit')).toHaveValue('unidade');
    await expect(page.locator('#purchase-price')).toHaveValue('7,25');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Recarregar a PWA volta ao pré-preenchimento do planejado (AC-15).
    await page.reload();
    await page.getByRole('button', { name: 'Marcar Arroz como comprado' }).click();
    await expect(page.locator('#purchase-quantity')).toHaveValue('2');
    await expect(page.locator('#purchase-unit')).toHaveValue('unidade');
    await expect(page.locator('#purchase-price')).toHaveValue('');
  });

  test('item comprado continua podendo ser editado e excluído', async ({ page }) => {
    const api = await openShoppingList(page, {
      seeds: [
        {
          name: 'Café',
          plannedQuantity: 1,
          unit: 'pacote',
          purchased: { quantity: 1, unit: 'pacote', unitPrice: 18.5 },
        },
      ],
    });

    // Edição com os mesmos efeitos de AC-10, mantendo o estado comprado.
    await page.getByRole('button', { name: 'Ações de Café' }).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#item-name').fill('Café torrado');
    await page.getByRole('button', { name: 'Salvar' }).click();

    const name = page.locator('.item-row__name');
    await expect(name).toHaveText('Café torrado');
    await expect(name).toHaveCSS('text-decoration-line', 'line-through');
    await expect(page.locator('.item-row__meta')).toHaveText('1 pacote · R$ 18,50');

    // Exclusão com os mesmos efeitos de AC-11: sai da lista ativa no serviço.
    await page.getByRole('button', { name: 'Ações de Café torrado' }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(listRows(page)).toHaveCount(0);
    expect(api.countRequests('DELETE', '/items/seed-1')).toBe(1);

    await page.reload();
    await expect(listRows(page)).toHaveCount(0);
    await expect(page.getByText('Sua lista está vazia')).toBeVisible();
  });

  test('falha de rede ao marcar/concluir: toast persistente, valor preservado, sem estado fantasma', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Leite', plannedQuantity: 1, unit: 'L' },
        { name: 'Café', purchased: { quantity: 1, unit: 'pacote', unitPrice: 18 } },
      ],
    });

    // Falha ao marcar: nada muda no serviço e o sheet guarda o digitado.
    api.failNext('PUT', '/purchase');
    await page.getByRole('button', { name: 'Marcar Leite como comprado' }).click();
    await page.locator('#purchase-price').fill('6,40');
    await page.getByRole('button', { name: 'Marcar como comprado' }).click();

    const errorToast = page.locator('.toast--error').last();
    await expect(errorToast).toContainText('Falha de rede');
    await expect(page.locator('#purchase-price')).toHaveValue('6,40');
    await expect(page.locator('.item-row__name').first()).toHaveCSS('text-decoration-line', 'none');

    // O toast de erro permanece até o descarte (≠ confirmação de ≈4s).
    await waitMs(4500);
    await expect(errorToast).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Falha ao concluir: nenhum comprado sai da lista.
    await page.getByRole('button', { name: 'Concluir compra' }).click();
    api.failNext('POST', '/checkout');
    await page
      .getByRole('dialog', { name: 'Concluir compra' })
      .getByRole('button', { name: 'Concluir compra' })
      .click();

    await expect(errorToast).toContainText('Falha de rede');
    await expect(listRows(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Desmarcar Café' })).toBeVisible();
  });
});
