import { test, expect } from '@playwright/test';

// Spec de fumaça (ADR 0004) ajustada à nova navegação (T10):
// sem sessão, a PWA sobe e redireciona a raiz para a tela de login (AC1/AC12)
// — tela cheia, fora do shell (sem app-bar). A tela de login em si é a T11;
// aqui valida-se apenas o desvio de navegação.
test('sem sessão, a PWA carrega e redireciona para o login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Lista de Compras');
  await page.waitForURL('**/login');
  await expect(page.locator('app-root')).toBeVisible();
  // Login é tela cheia, fora da navegação (AC1): sem app-bar nem bottom nav.
  await expect(page.locator('.app-bar')).toHaveCount(0);
});