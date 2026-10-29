import { expect, test } from '@playwright/test';
import { todayLocal } from '../support/dates';
import { openShoppingList } from '../support/shopping-list-journey';
import { listRows } from '../support/ui';

/** JPEG mínimo válido para o input file (bytes reais, sem Gemini). */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQACEADAD8APf/Z',
  'base64',
);

test.describe('Lista — importar compra pela foto da nota', () => {
  test('recognize → revisão → apply (replace) → checkout prefilled', async ({ page }) => {
    const api = await openShoppingList(page, {
      seeds: [
        { name: 'Café', plannedQuantity: 1, unit: 'pacote', plannedPrice: 10 },
        { name: 'Leite', plannedQuantity: 2, unit: 'L' },
      ],
      delayMs: 80,
      recognizeResponse: {
        market: 'Mercado Central',
        purchaseDate: todayLocal(),
        lines: [
          { name: 'Café', quantity: 2, unit: 'pacote', unitPrice: 18.5 },
          { name: 'Pão', quantity: 1, unit: 'unidade', unitPrice: 8 },
          { name: null, quantity: 1, unit: 'kg', unitPrice: 4 },
        ],
      },
    });

    await expect(listRows(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Importar nota' }).click();
    const source = page.getByRole('dialog', { name: 'Importar nota' });
    await expect(source).toBeVisible();
    await source.getByRole('button', { name: 'Escolher da galeria' }).click();
    await page.locator('input[type="file"]:not([capture])').setInputFiles({
      name: 'nota.jpg',
      mimeType: 'image/jpeg',
      buffer: TINY_JPEG,
    });

    await expect(page.getByText('Lendo a nota…')).toBeVisible();
    const review = page.getByRole('dialog', { name: 'Revisar nota' });
    await expect(review).toBeVisible();
    await expect(review.getByText('Confira os itens antes de marcar como comprados.')).toBeVisible();
    await expect(review.locator('#receipt-market')).toHaveValue('Mercado Central');
    await expect(review.locator('#receipt-date')).toHaveValue(todayLocal());

    // Linha incompleta (sem nome) não conta para o apply até completar.
    await expect(review.getByRole('button', { name: 'Confirmar importação' })).toBeEnabled();

    await review.locator('#line-2-name').fill('Banana');
    await review.getByRole('button', { name: 'Confirmar importação' }).click();

    expect(api.countRequests('POST', '/receipts/recognize')).toBe(1);
    expect(api.countRequests('POST', '/receipts/apply')).toBe(1);

    const checkout = page.getByRole('dialog', { name: 'Concluir compra' });
    await expect(checkout).toBeVisible();
    await expect(checkout.locator('#checkout-market')).toHaveValue('Mercado Central');
    await expect(checkout.locator('#checkout-date')).toHaveValue(todayLocal());

    // Café substituído + Pão + Banana comprados; Leite permanece pendente.
    await expect(page.locator('.summary')).toHaveText('1 pendente · 3 comprados');

    await checkout.getByRole('button', { name: 'Cancelar' }).click();
    await expect(checkout).toHaveCount(0);
    await expect(page.locator('.summary')).toHaveText('1 pendente · 3 comprados');
    expect(api.countRequests('POST', '/checkout')).toBe(0);
  });

  test('recognize 503 mostra erro e não altera a lista', async ({ page }) => {
    const api = await openShoppingList(page, {
      seeds: [{ name: 'Arroz', plannedQuantity: 1, unit: 'kg' }],
      recognizeStatus: 503,
    });

    await expect(listRows(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Importar nota' }).click();
    await page.getByRole('dialog', { name: 'Importar nota' })
      .getByRole('button', { name: 'Escolher da galeria' })
      .click();
    await page.locator('input[type="file"]:not([capture])').setInputFiles({
      name: 'nota.jpg',
      mimeType: 'image/jpeg',
      buffer: TINY_JPEG,
    });

    await expect(page.getByText(/reconhecimento indisponível|Não foi possível/i)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Revisar nota' })).toHaveCount(0);
    await expect(listRows(page)).toHaveCount(1);
    expect(api.countRequests('POST', '/receipts/apply')).toBe(0);
  });

  test('recognize sem linhas abre empty state na revisão', async ({ page }) => {
    await openShoppingList(page, {
      seeds: [],
      recognizeResponse: { market: null, purchaseDate: null, lines: [] },
    });

    await page.getByRole('button', { name: 'Importar nota' }).click();
    await page.getByRole('dialog', { name: 'Importar nota' })
      .getByRole('button', { name: 'Escolher da galeria' })
      .click();
    await page.locator('input[type="file"]:not([capture])').setInputFiles({
      name: 'nota.jpg',
      mimeType: 'image/jpeg',
      buffer: TINY_JPEG,
    });

    const review = page.getByRole('dialog', { name: 'Revisar nota' });
    await expect(review).toBeVisible();
    await expect(review.getByText('Nenhum item reconhecido')).toBeVisible();
    await expect(review.getByRole('button', { name: 'Confirmar importação' })).toBeDisabled();
  });
});
