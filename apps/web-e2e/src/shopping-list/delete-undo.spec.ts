import { expect, test } from '@playwright/test';
import { openShoppingList } from '../support/shopping-list-journey';
import { listRows, waitMs } from '../support/ui';

test.describe('Lista — excluir e desfazer', () => {
  test('excluir sai na hora; Desfazer restaura com os mesmos dados (inclusive comprado); sem desfazer permanece excluído', async ({
    page,
  }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Arroz', plannedQuantity: 2, unit: 'kg', plannedPrice: 31.9 },
        {
          name: 'Café',
          plannedQuantity: 1,
          unit: 'pacote',
          purchased: { quantity: 1, unit: 'pacote', unitPrice: 18.5 },
        },
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(2);

    // Excluir um pendente: a linha sai na hora e o toast oferece "Desfazer".
    await page.getByRole('button', { name: 'Ações de Arroz' }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();

    await expect(rows).toHaveCount(1);
    await expect(page.getByText('Arroz')).toHaveCount(0);
    expect(api.countRequests('DELETE', '/items/seed-1')).toBe(1);

    const undoToast = page.locator('.toast').last();
    await expect(undoToast).toContainText('Item excluído');
    await expect(undoToast.getByRole('button', { name: 'Desfazer' })).toBeVisible();

    // "Desfazer" restaura com os mesmos dados planejados.
    await undoToast.getByRole('button', { name: 'Desfazer' }).click();

    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Arroz');
    await expect(rows.first().locator('.item-row__meta')).toHaveText('2 kg · R$ 31,90');
    expect(api.countRequests('POST', '/items/seed-1/restore')).toBe(1);
    await expect(page.locator('.toast')).toHaveCount(0);

    // Excluir um comprado e desfazer: volta comprado (dados da compra intactos).
    await page.getByRole('button', { name: 'Ações de Café' }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(rows).toHaveCount(1);

    await page.locator('.toast').last().getByRole('button', { name: 'Desfazer' }).click();

    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1).locator('.item-row__name')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    );
    await expect(rows.nth(1).locator('.item-row__meta')).toHaveText('1 pacote · R$ 18,50');
    await expect(page.getByRole('button', { name: 'Desmarcar Café' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Sem desfazer: a janela de ≈4s fecha, o toast some e o item não volta.
    await page.getByRole('button', { name: 'Ações de Arroz' }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(rows).toHaveCount(1);

    await waitMs(4500);
    await expect(page.locator('.toast')).toHaveCount(0);

    // A exclusão ficou no serviço: recarregar a PWA não ressuscita a linha.
    await page.reload();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Café');
    await expect(page.getByText('Arroz')).toHaveCount(0);
  });
});
