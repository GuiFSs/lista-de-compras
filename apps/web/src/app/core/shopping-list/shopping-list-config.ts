import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Base do shopping-list-service na v1 local — exceção temporária à ADR 0001
 * registrada na ADR 0009. Migração para o gateway: a base vira URL relativa
 * (critério de saída §3 da ADR 0009).
 */
export const DEFAULT_SHOPPING_LIST_API_BASE_URL =
  environment.shoppingListApiBaseUrl;

/** Caminho das operações da lista, já sob o prefixo `api` do serviço. */
export const SHOPPING_LIST_API_PATH = '/api/shopping-list';

/**
 * Base injetável: permite apontar os testes para outra URL sem tocar no
 * serviço HTTP, e é o ponto único a deprecar quando o gateway existir.
 */
export const SHOPPING_LIST_API_BASE_URL = new InjectionToken<string>(
  'SHOPPING_LIST_API_BASE_URL',
  { providedIn: 'root', factory: () => DEFAULT_SHOPPING_LIST_API_BASE_URL },
);

export function shoppingListUrl(baseUrl: string, path = ''): string {
  return `${baseUrl.replace(/\/+$/, '')}${SHOPPING_LIST_API_PATH}${path}`;
}
