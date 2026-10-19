import * as corsModule from '@fastify/cors';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

/** Origem padrão da PWA em desenvolvimento (ADR 0010). */
export const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';

/** Prefixo global dos serviços — todos expõem rotas sob `/api`. */
export const GLOBAL_PREFIX = 'api';

/** Rota base do histórico — os controllers de negócio são anexados aqui. */
export const PRICE_HISTORY_ROUTE = `/${GLOBAL_PREFIX}/price-history`;

/**
 * Prefixo `api` + CORS da PWA (ADR 0010 §2) — idêntico em produção e nos
 * testes (`inject`). `PRICE_HISTORY_CORS_ORIGINS` aceita CSV de origens.
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_PREFIX);

  const origins = parseCorsOrigins(
    config.get<string>('PRICE_HISTORY_CORS_ORIGINS'),
  );
  // `@fastify/cors` é CJS: `?? default` cobre interop webpack/CJS e Vitest/ESM.
  const corsPlugin = corsModule.default ?? corsModule;
  await app.register(corsPlugin, {
    origin: origins,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

/** Converte `PRICE_HISTORY_CORS_ORIGINS` (CSV) em lista; vazio/ausente → fallback. */
export function parseCorsOrigins(value: string | undefined): string[] {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : [DEFAULT_CORS_ORIGINS];
}
