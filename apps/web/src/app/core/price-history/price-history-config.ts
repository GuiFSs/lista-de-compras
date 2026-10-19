import { InjectionToken } from '@angular/core';

/**
 * Base do price-history-service na v1 local — exceção temporária ao gateway
 * registrada na ADR 0010. Migração para o gateway: a base sai da configuração
 * da PWA e a chamada vira URL relativa (critérios de saída §3 da ADR 0010).
 */
export const DEFAULT_PRICE_HISTORY_API_BASE_URL = 'http://localhost:3002';

/** Caminho das operações do histórico, já sob o prefixo `api` do serviço. */
export const PRICE_HISTORY_API_PATH = '/api/price-history';

/**
 * Base injetável: permite apontar os testes para outra URL sem tocar no
 * serviço HTTP, e é o ponto único a deprecar quando o gateway existir.
 */
export const PRICE_HISTORY_API_BASE_URL = new InjectionToken<string>(
  'PRICE_HISTORY_API_BASE_URL',
  { providedIn: 'root', factory: () => DEFAULT_PRICE_HISTORY_API_BASE_URL },
);

export function priceHistoryUrl(baseUrl: string, path = ''): string {
  return `${baseUrl.replace(/\/+$/, '')}${PRICE_HISTORY_API_PATH}${path}`;
}
