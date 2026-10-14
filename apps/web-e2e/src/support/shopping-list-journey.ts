import type { Page } from '@playwright/test';
import { login } from './session';
import { FakeApiOptions, ShoppingListFakeApi } from './shopping-list-fake-api';

/**
 * Abre a jornada da Lista de forma hermética (ADR 0008/0009): a API falsa
 * entra antes de qualquer requisição, a sessão é criada pelo login real e a
 * PWA é aberta na rota da lista. Sem Docker, banco ou chaves.
 */
export async function openShoppingList(
  page: Page,
  options: FakeApiOptions = {},
): Promise<ShoppingListFakeApi> {
  const api = new ShoppingListFakeApi(options);
  await api.mount(page);
  await login(page);
  await page.goto('/');
  return api;
}
