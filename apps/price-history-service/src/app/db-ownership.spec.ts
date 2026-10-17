// AC-17 — o price-history-service serve o histórico apenas pelo banco
// `price_history`, nunca pelo banco do shopping-list.
//
// O PLAN.md (T-20) pede, para AC-17, a prova de "ausência de `DATABASE_URL` do
// shopping-list / sem client cross-DB". Diferente do spec de borda HTTP — que
// troca `PurchaseRepository` por um fake em memória —, este sobe o `AppModule`
// REAL: o cliente Drizzle vem do provider de produção, resolvido só por
// `PRICE_HISTORY_DATABASE_URL`.
//
// Duas provas complementares:
// 1. comportamental — com `DATABASE_URL` (a variável do shopping-list)
//    apontando para um host morto, `GET /purchases` continua 200;
// 2. de composição — o cliente Drizzle composto conecta em `price_history`.
//
// Pré-requisitos: Docker Postgres de pé e `npx nx run
// price-history-service:db:migrate` (os mesmos de `purchase.repository.spec.ts`).
import { Test, type TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PurchaseListResponse } from '@lista/contracts';
import { AppModule } from './app.module';
import { PRICE_HISTORY_ROUTE, configureApp } from './configure-app';
import type { PriceHistoryDb } from '../infrastructure/persistence/drizzle/client';
import { DRIZZLE } from '../infrastructure/persistence/drizzle/drizzle.provider';
import { signTestJwt } from '../test-fixtures/jwt-test-utils';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const PURCHASES_ROUTE = `${PRICE_HISTORY_ROUTE}/purchases`;

// Porta sem listener: qualquer tentativa de conectar neste banco falharia.
const DEAD_SHOPPING_LIST_URL =
  'postgresql://lista:lista@127.0.0.1:59999/shopping_list';

describe('AC-17 — histórico só no banco próprio, sem client cross-DB', () => {
  let app: NestFastifyApplication;
  let moduleRef: TestingModule;
  let db: PriceHistoryDb;
  let token: string;
  const originalDatabaseUrl = process.env['DATABASE_URL'];

  beforeAll(async () => {
    // Sob `nx test` o Nx pré-carrega o `.env` da raiz; o `ConfigModule` não
    // reescreve chaves já presentes em `process.env`, então este valor morto é
    // o que o app enxerga como banco da lista.
    process.env['DATABASE_URL'] = DEAD_SHOPPING_LIST_URL;

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    db = app.get<PriceHistoryDb>(DRIZZLE);
    token = await signTestJwt();
  });

  afterAll(async () => {
    await app.close();
    // O DrizzleModule não registra lifecycle hook: fecha o Pool do teste à mão
    // (mesmo padrão de `purchase.repository.spec.ts`).
    await db.$client.end();
    if (originalDatabaseUrl === undefined) {
      delete process.env['DATABASE_URL'];
    } else {
      process.env['DATABASE_URL'] = originalDatabaseUrl;
    }
  });

  it('responde 200 com o banco da lista apontando para um host morto', async () => {
    // Sanidade: o valor morto segue no ambiente no momento do request.
    expect(process.env['DATABASE_URL']).toBe(DEAD_SHOPPING_LIST_URL);

    const res = await app.inject({
      method: 'GET',
      url: PURCHASES_ROUTE,
      headers: { authorization: `Bearer ${token}` },
    });

    // A borda serve do banco `price_history`; se o histórico dependesse do
    // `DATABASE_URL` morto acima, a query falharia (500 em vez de 200).
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json<PurchaseListResponse>().purchases)).toBe(true);
  });

  it('o cliente Drizzle composto conecta no banco `price_history`', () => {
    const client = db.$client;
    // `pg.Pool` é o único membro da união `$client` que expõe `options`; o
    // `Pool` guarda a `connectionString` crua (o alvo é resolvido por query).
    const connectionString =
      'options' in client ? client.options.connectionString : undefined;
    expect(connectionString).toBeDefined();

    const target = new URL(String(connectionString));
    expect(target.pathname).toBe('/price_history');
    expect(target.pathname).not.toBe('/shopping_list');
  });
});
