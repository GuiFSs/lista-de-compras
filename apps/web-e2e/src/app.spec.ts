import { test, expect } from '@playwright/test';

// Spec de fumaça do setup (ADR 0004): só valida que a PWA sobe,
// renderiza o shell e não quebra. Testes de features entram pelo ciclo SDD.
test('a aplicação carrega e renderiza o shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Lista de Compras');
  await expect(page.locator('h1')).toHaveText('Lista de Compras');
  await expect(page.locator('app-root')).toBeVisible();
});
