// Configuração do app Nest+Fastify compartilhada entre produção (main.ts) e
// testes de integração (inject): prefixo global `api`, CORS da PWA (ADR 0006)
// e parser JSON que garante o envelope canônico (T3/🟠-1).
//
// Nota (T6): rejeições de transporte (ex.: JSON malformado) são tratadas
// pelo parser JSON registrado abaixo — ele lança BadRequestException, que
// o filtro de exceção do Nest converte no envelope canônico de
// @lista/contracts, em vez da mensagem padrão do Fastify. Os 400/401/429/500
// do CONTRATO (campos ausentes/não-string/vazios, credenciais, rate limit,
// erro interno) nascem no controller/caso de uso e já saem no envelope
// canônico de @lista/contracts (T3/🟠-1).
import * as corsModule from '@fastify/cors';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { LOGIN_400_MESSAGE } from './login-messages';

/** Origem padrão da PWA em desenvolvimento (ADR 0006 / PLAN.md — CORS). */
export const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';

/** Rota final do login: prefixo global `api` + rota do controller `auth`. */
export const LOGIN_ROUTE = '/api/auth/login';

/**
 * Aplica, de forma idêntica em produção e nos testes:
 *
 * 1. Prefixo global `api` — o gateway futuro roteia `/api/auth/*` (ADR 0006);
 * 2. CORS via `@fastify/cors`: `origin` = lista de `AUTH_CORS_ORIGINS`
 *    (default `http://localhost:4200`), `methods: ['POST','OPTIONS']` e
 *    `allowedHeaders: ['Content-Type','Authorization']` — chamada direta da
 *    PWA ao auth-service (ADR 0006). O preflight `OPTIONS` é respondido pelo
 *    plugin.
 * 3. Parser JSON próprio para `application/json`, via
 *    `FastifyAdapter.useBodyParser` (ponto de extensão oficial do adapter):
 *    além de registrar o parser, ele marca os parsers como já registrados,
 *    de modo que o `init()` do Nest não tenta registrar o padrão — sem o
 *    "Content type parser already present". Corpo malformado (ex.:
 *    `'{username:'`) vira `BadRequestException`, que o filtro de exceção do
 *    Nest converte no envelope canônico de @lista/contracts (T3/🟠-1),
 *    em vez da mensagem padrão do Fastify ("Body is not valid JSON...").
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const origins = parseCsv(
    config.get<string>('AUTH_CORS_ORIGINS'),
    DEFAULT_CORS_ORIGINS,
  );
  // `@fastify/cors` é CJS (`export =` com namespace): em runtime o módulo é a
  // própria função do plugin, com `.default`/`.fastifyCors` apontando para ela.
  // O `?? default` cobre os dois formatos de interop (webpack/CJS e Vitest/ESM).
  const corsPlugin = corsModule.default ?? corsModule;
  await app.register(corsPlugin, {
    origin: origins,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Parser JSON próprio: garante o envelope canônico (T3/🟠-1) quando o
  // corpo está malformado. O useBodyParser entrega o corpo como Buffer
  // (parseAs: 'buffer'); sucesso entrega o objeto parseado ao `@Body()` do
  // controller, e falha vira BadRequestException → filtro do Nest → 400
  // canônico. O bodyLimit segue a configuração do servidor (como o padrão
  // do Nest).
  const adapter: any = app.getHttpAdapter();
  const instance = adapter.getInstance?.();
  const { bodyLimit } = instance?.initialConfig ?? { bodyLimit: 1048576 };
  adapter.useBodyParser?.(
    'application/json',
    false,
    { bodyLimit },
    (_req: any, body: Buffer, done: (err: Error | null, result?: unknown) => void) => {
      try {
        done(null, JSON.parse(body.toString()));
      } catch {
        done(
          new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: LOGIN_400_MESSAGE,
          }),
        );
      }
    },
  );
}

/** Converte `AUTH_CORS_ORIGINS` (CSV) em lista; vazio/ausente → fallback. */
function parseCsv(value: string | undefined, fallback: string): string[] {
  const items =
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0) ?? [];
  return items.length > 0 ? items : [fallback];
}
