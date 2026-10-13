import * as corsModule from '@fastify/cors';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

/** Origem padrão da PWA em desenvolvimento (ADR 0009). */
export const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';

/**
 * 400 de corpo não interpretável como JSON. Mensagem PT genérica própria da
 * borda (não é uma das validações de negócio por campo) — o contrato exige
 * `message` genérica, nunca o detalhe técnico do parser do Fastify.
 */
export const MALFORMED_JSON_MESSAGE = 'Corpo da requisição inválido';

/** Prefixo global dos serviços — todos expõem rotas sob `/api`. */
export const GLOBAL_PREFIX = 'api';

/** Rota base da lista ativa. */
export const SHOPPING_LIST_ROUTE = `/${GLOBAL_PREFIX}/shopping-list`;

/**
 * Prefixo `api` e CORS da PWA (ADR 0009 §2) — idêntico em produção e nos
 * testes (`inject`). O CORS viabiliza a chamada cruzada local; a autorização
 * continua sendo o JWT validado localmente (ADR 0007).
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_PREFIX);

  const origins = parseCsv(
    config.get<string>('SHOPPING_LIST_CORS_ORIGINS'),
    DEFAULT_CORS_ORIGINS,
  );
  // `@fastify/cors` é CJS: em runtime o módulo é a função do plugin.
  // `?? default` cobre interop webpack/CJS e Vitest/ESM.
  const corsPlugin = corsModule.default ?? corsModule;
  await app.register(corsPlugin, {
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Parser próprio: corpo JSON malformado vira `BadRequestException` com o
  // envelope canônico, em vez da mensagem técnica em inglês do Fastify (mesmo
  // padrão do auth-service). O cast recupera a assinatura tipada do adapter.
  const adapter = app.getHttpAdapter() as FastifyAdapter;
  const { bodyLimit } = adapter.getInstance().initialConfig;
  adapter.useBodyParser(
    'application/json',
    false,
    { bodyLimit },
    (_req, body, done) => {
      try {
        done(null, JSON.parse(body.toString()));
      } catch {
        done(
          new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: MALFORMED_JSON_MESSAGE,
          }),
        );
      }
    },
  );
}

/** Converte `SHOPPING_LIST_CORS_ORIGINS` (CSV) em lista; vazio/ausente → fallback. */
function parseCsv(value: string | undefined, fallback: string): string[] {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : [fallback];
}
