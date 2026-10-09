import * as corsModule from '@fastify/cors';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { LOGIN_400_MESSAGE } from './login-messages';

/** Origem padrão da PWA em desenvolvimento. */
export const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';

/** Rota final do login: prefixo `api` + controller `auth`. */
export const LOGIN_ROUTE = '/api/auth/login';

/**
 * Prefixo `api`, CORS e parser JSON com envelope canônico —
 * idêntico em produção e nos testes (`inject`).
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const origins = parseCsv(
    config.get<string>('AUTH_CORS_ORIGINS'),
    DEFAULT_CORS_ORIGINS,
  );
  // `@fastify/cors` é CJS: em runtime o módulo é a função do plugin.
  // `?? default` cobre interop webpack/CJS e Vitest/ESM.
  const corsPlugin = corsModule.default ?? corsModule;
  await app.register(corsPlugin, {
    origin: origins,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Parser próprio: JSON malformado → BadRequestException → envelope canônico
  // (evita a mensagem padrão do Fastify). Cast recupera a assinatura tipada.
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
