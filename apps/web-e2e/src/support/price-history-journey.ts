import type { Page } from '@playwright/test';
import { login } from './session';
import {
  PriceHistoryFakeApi,
  PriceHistoryFakeApiOptions,
} from './price-history-fake-api';
import { FakeApiOptions, ShoppingListFakeApi } from './shopping-list-fake-api';

/** Semente de cada serviço para a jornada; ambos os contratos são interceptados. */
export interface PriceHistoryJourneyOptions {
  priceHistory?: PriceHistoryFakeApiOptions;
  shoppingList?: FakeApiOptions;
}

/** Os dois serviços em memória, para as asserções de contrato no teste. */
export interface PriceHistoryJourney {
  priceHistory: PriceHistoryFakeApi;
  shoppingList: ShoppingListFakeApi;
}

/**
 * Abre uma jornada hermética do Histórico (ADR 0008/0010): as **duas** APIs
 * falsas entram antes de qualquer requisição (Histórico e Lista convivem na
 * navegação), a sessão é criada pelo login real e a PWA é aberta na rota
 * pedida. Sem Docker, banco, broker ou JWT real.
 */
export async function openPriceHistory(
  page: Page,
  route = '/historico',
  options: PriceHistoryJourneyOptions = {},
): Promise<PriceHistoryJourney> {
  const priceHistory = new PriceHistoryFakeApi(options.priceHistory);
  const shoppingList = new ShoppingListFakeApi(options.shoppingList);
  await priceHistory.mount(page);
  await shoppingList.mount(page);
  await login(page);
  await page.goto(route);
  return { priceHistory, shoppingList };
}
