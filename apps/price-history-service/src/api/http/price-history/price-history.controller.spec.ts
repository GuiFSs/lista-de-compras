// Testes de integração da borda HTTP do histórico (T-08), via Fastify `inject`.
//
// Cobertura exigida pela T-08 (PLAN.md "Estratégia de testes" + ACs):
// - 200 de listagem/detalhe/menores preços nos shapes de `@lista/contracts`
//   (AC-06, AC-08…AC-11);
// - 404 canônico de detalhe inexistente (AC-11);
// - `?q=` com a mesma normalização do domínio (`cafe` encontra `café`) e
//   busca sem resultado vazia (AC-09);
// - 401 uniforme em todas as rotas sem/com token inválido (AC-18, ADR 0007);
// - CORS da PWA em `localhost:4200` (AC-21, ADR 0010);
// - 500 canônico sem detalhe interno no corpo (detalhe só no log).
//
// O harness troca o port `PurchaseRepository` pelo repositório em memória
// (mesmo padrão do `shopping-list.controller.spec.ts`) — não depende do banco.
// Um segundo app com repositório que falha prova o 500 canônico.
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiErrorResponse,
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from '@lista/contracts';
import { AppModule } from '../../../app/app.module';
import {
  PRICE_HISTORY_ROUTE,
  configureApp,
} from '../../../app/configure-app';
import {
  PurchaseRepository,
  PurchaseSummary,
} from '../../../application/ports/purchase-repository.port';
import { InMemoryPurchaseRepository } from '../../../application/use-cases/testing/in-memory-purchase-repository';
import {
  makePurchase,
  uuid,
} from '../../../application/use-cases/testing/purchase-fixtures';
import type { PriceHistoryPurchase } from '../../../domain/purchase';
import { signTestJwt } from '../../../test-fixtures/jwt-test-utils';

const PURCHASES_ROUTE = `${PRICE_HISTORY_ROUTE}/purchases`;
const LOWEST_ROUTE = `${PRICE_HISTORY_ROUTE}/lowest-prices`;

const OLDER_ID = uuid(1);
const NEWER_ID = uuid(2);
const UNKNOWN_ID = uuid(99);

const AUTHORIZATION_MESSAGE = 'Não autorizado';
const NOT_FOUND_MESSAGE = 'Compra não encontrada';
const INTERNAL_ERROR_MESSAGE = 'Erro interno';
const FAILURE_DETAIL = 'falha simulada do banco price_history (0xDEADBEEF)';

/**
 * Duas compras de mercados/datas distintos; `café` aparece nos dois com preços
 * diferentes para provar a agregação de menor preço na borda (AC-08/AC-10).
 */
function seedPurchases(): PriceHistoryPurchase[] {
  return [
    makePurchase(
      [
        { name: 'Café', unitPrice: 10, unit: 'pacote' },
        { name: 'Leite', unitPrice: 5.5 },
      ],
      {
        id: OLDER_ID,
        market: 'Mercado Zebra',
        purchaseDate: '2026-10-12',
        createdAt: '2026-10-12T12:00:00.000Z',
      },
    ),
    makePurchase(
      [
        { name: 'Café', unitPrice: 7.5, unit: 'pacote' },
        { name: 'Arroz', unitPrice: 4.2, quantity: 2, unit: 'kg' },
      ],
      {
        id: NEWER_ID,
        market: 'Mercado Alfa',
        purchaseDate: '2026-10-14',
        createdAt: '2026-10-14T12:00:00.000Z',
      },
    ),
  ];
}

/**
 * Repositório de teste com seed recriável a cada caso. Delega para o
 * `InMemoryPurchaseRepository` (o mapa dele é privado) — o `reset` recria a
 * instância interna, então os casos de uso seguem usando este delegador.
 */
class ResettablePurchaseRepository extends PurchaseRepository {
  private current = new InMemoryPurchaseRepository();

  reset(seed: readonly PriceHistoryPurchase[] = []): void {
    this.current = new InMemoryPurchaseRepository(seed);
  }

  override insert(purchase: PriceHistoryPurchase): Promise<boolean> {
    return this.current.insert(purchase);
  }

  override listSummaries(): Promise<PurchaseSummary[]> {
    return this.current.listSummaries();
  }

  override findById(id: string): Promise<PriceHistoryPurchase | null> {
    return this.current.findById(id);
  }

  override findAllWithItems(): Promise<PriceHistoryPurchase[]> {
    return this.current.findAllWithItems();
  }
}

/** Repositório que lança — prova o 500 canônico sem vazar o detalhe. */
class FailingPurchaseRepository extends PurchaseRepository {
  private fail(): never {
    throw new Error(FAILURE_DETAIL);
  }

  override async insert(): Promise<boolean> {
    return this.fail();
  }

  override async listSummaries(): Promise<PurchaseSummary[]> {
    return this.fail();
  }

  override async findById(): Promise<PriceHistoryPurchase | null> {
    return this.fail();
  }

  override async findAllWithItems(): Promise<PriceHistoryPurchase[]> {
    return this.fail();
  }
}

const PROTECTED_ROUTES = [
  PURCHASES_ROUTE,
  `${PURCHASES_ROUTE}/${UNKNOWN_ID}`,
  `${LOWEST_ROUTE}?q=cafe`,
];

describe('Borda HTTP do histórico — integração via inject (T-08)', () => {
  let app: NestFastifyApplication;
  let repository: ResettablePurchaseRepository;
  let token: string;

  const auth = (): { authorization: string } => ({
    authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    repository = new ResettablePurchaseRepository();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PurchaseRepository)
      .useValue(repository)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    // Mesmo `configureApp` de produção (prefixo `api` + CORS ADR 0010).
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    token = await signTestJwt();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.reset(seedPurchases());
  });

  describe('GET /api/price-history/purchases (AC-06)', () => {
    it('200 — lista mais recente primeiro no shape exato do contrato', async () => {
      const res = await app.inject({
        method: 'GET',
        url: PURCHASES_ROUTE,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<PurchaseListResponse>();
      expect(body.purchases.map((purchase) => purchase.id)).toEqual([
        NEWER_ID,
        OLDER_ID,
      ]);

      // Shape exato do contrato (T-02): sem campos extras.
      const first = body.purchases[0];
      expect(Object.keys(first).sort()).toEqual([
        'createdAt',
        'id',
        'itemCount',
        'market',
        'purchaseDate',
      ]);
      expect(first).toMatchObject({
        id: NEWER_ID,
        market: 'Mercado Alfa',
        purchaseDate: '2026-10-14',
        itemCount: 2,
      });
      expect(new Date(first.createdAt).toISOString()).toBe(first.createdAt);
      expect(body.purchases[1].itemCount).toBe(2);
    });

    it('200 — lista vazia devolve `purchases: []` (insumo do empty state, AC-12)', async () => {
      repository.reset([]);

      const res = await app.inject({
        method: 'GET',
        url: PURCHASES_ROUTE,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<PurchaseListResponse>()).toEqual({ purchases: [] });
    });
  });

  describe('GET /api/price-history/purchases/:id (AC-11)', () => {
    it('200 — detalhe com data, mercado e itens comprados', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${PURCHASES_ROUTE}/${OLDER_ID}`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<PurchaseDetailResponse>();
      expect(Object.keys(body).sort()).toEqual([
        'createdAt',
        'id',
        'items',
        'market',
        'purchaseDate',
      ]);
      expect(body).toMatchObject({
        id: OLDER_ID,
        market: 'Mercado Zebra',
        purchaseDate: '2026-10-12',
      });
      // `nameNormalized` é interno do domínio e não pode vazar na borda.
      expect(body.items).toHaveLength(2);
      expect(body.items).toEqual(
        expect.arrayContaining([
          { name: 'Café', quantity: 1, unit: 'pacote', unitPrice: 10 },
          { name: 'Leite', quantity: 1, unit: 'unidade', unitPrice: 5.5 },
        ]),
      );
      for (const item of body.items) {
        expect(Object.keys(item).sort()).toEqual([
          'name',
          'quantity',
          'unit',
          'unitPrice',
        ]);
      }
    });

    it('404 — id inexistente usa o envelope canônico', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${PURCHASES_ROUTE}/${UNKNOWN_ID}`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(404);
      const body = res.json<ApiErrorResponse>();
      expect(body).toEqual({ statusCode: 404, message: NOT_FOUND_MESSAGE });
      expect(Object.keys(body).sort()).toEqual(['message', 'statusCode']);
    });
  });

  describe('GET /api/price-history/lowest-prices (AC-08…AC-10)', () => {
    it('200 — sem `q` devolve todos os itens agregados, com o menor preço', async () => {
      const res = await app.inject({
        method: 'GET',
        url: LOWEST_ROUTE,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<LowestPricesResponse>();
      // Ordenação estável por `nameNormalized` asc (contrato T-02).
      expect(body.items).toEqual([
        { name: 'Arroz', nameNormalized: 'arroz', lowestUnitPrice: 4.2 },
        { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
        { name: 'Leite', nameNormalized: 'leite', lowestUnitPrice: 5.5 },
      ]);
    });

    it('200 — `q=cafe` encontra o registrado como `café` (AC-09)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${LOWEST_ROUTE}?q=cafe`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<LowestPricesResponse>().items).toEqual([
        { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
      ]);
    });

    it('200 — `q` sem resultado devolve lista vazia (empty de busca, AC-09)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${LOWEST_ROUTE}?q=banana`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<LowestPricesResponse>()).toEqual({ items: [] });
    });

    it('200 — `q` vazia devolve a lista completa (RN-07a)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${LOWEST_ROUTE}?q=`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<LowestPricesResponse>().items).toHaveLength(3);
    });

    it('200 — `q` repetida usa o primeiro termo (normalização da borda)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${LOWEST_ROUTE}?q=cafe&q=arroz`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<LowestPricesResponse>().items.map((i) => i.nameNormalized)).toEqual([
        'cafe',
      ]);
    });
  });

  describe('401 — guard global de JWT (ADR 0007 / AC-18)', () => {
    it.each(PROTECTED_ROUTES)(
      'sem token responde 401 uniforme — %s',
      async (url) => {
        const res = await app.inject({ method: 'GET', url });

        expect(res.statusCode).toBe(401);
        expect(res.json<ApiErrorResponse>()).toEqual({
          statusCode: 401,
          message: AUTHORIZATION_MESSAGE,
        });
        expect(Object.keys(res.json()).sort()).toEqual([
          'message',
          'statusCode',
        ]);
      },
    );

    it.each(PROTECTED_ROUTES)(
      'token inválido também é 401 uniforme — %s',
      async (url) => {
        const res = await app.inject({
          method: 'GET',
          url,
          headers: { authorization: 'Bearer nao-e-um-jwt' },
        });

        expect(res.statusCode).toBe(401);
        expect(res.json<ApiErrorResponse>()).toEqual({
          statusCode: 401,
          message: AUTHORIZATION_MESSAGE,
        });
      },
    );
  });

  describe('CORS (ADR 0010 / AC-21)', () => {
    it('preflight OPTIONS da origem da PWA é aceito com GET/OPTIONS e os headers', async () => {
      const preflight = await app.inject({
        method: 'OPTIONS',
        url: PURCHASES_ROUTE,
        headers: {
          origin: 'http://localhost:4200',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'content-type, authorization',
        },
      });

      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers['access-control-allow-origin']).toBe(
        'http://localhost:4200',
      );
      const allowMethods = String(
        preflight.headers['access-control-allow-methods'],
      )
        .split(',')
        .map((method) => method.trim());
      expect(allowMethods).toEqual(expect.arrayContaining(['GET', 'OPTIONS']));
      const allowHeaders = String(
        preflight.headers['access-control-allow-headers'],
      )
        .toUpperCase()
        .split(',')
        .map((header) => header.trim());
      expect(allowHeaders).toEqual(
        expect.arrayContaining(['CONTENT-TYPE', 'AUTHORIZATION']),
      );
    });

    it('origem permitida recebe o header; origem desconhecida não', async () => {
      const allowed = await app.inject({
        method: 'GET',
        url: PURCHASES_ROUTE,
        headers: { ...auth(), origin: 'http://localhost:4200' },
      });
      expect(allowed.statusCode).toBe(200);
      expect(allowed.headers['access-control-allow-origin']).toBe(
        'http://localhost:4200',
      );

      const denied = await app.inject({
        method: 'GET',
        url: PURCHASES_ROUTE,
        headers: { ...auth(), origin: 'https://evil.example' },
      });
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});

describe('Borda HTTP do histórico — 500 canônico (T-08)', () => {
  let app: NestFastifyApplication;
  let token: string;
  const capturedLogs: unknown[][] = [];
  const recordingLogger = {
    log: (...args: unknown[]) => capturedLogs.push(args),
    error: (...args: unknown[]) => capturedLogs.push(args),
    warn: (...args: unknown[]) => capturedLogs.push(args),
    debug: (...args: unknown[]) => capturedLogs.push(args),
    verbose: (...args: unknown[]) => capturedLogs.push(args),
    fatal: (...args: unknown[]) => capturedLogs.push(args),
  };

  beforeAll(async () => {
    Logger.overrideLogger(recordingLogger);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PurchaseRepository)
      .useValue(new FailingPurchaseRepository())
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    token = await signTestJwt();
  });

  beforeEach(() => {
    Logger.overrideLogger(recordingLogger);
    capturedLogs.length = 0;
  });

  afterAll(async () => {
    await app.close();
    Logger.overrideLogger([]);
  });

  it.each(PROTECTED_ROUTES)(
    '500 — envelope canônico sem detalhe interno; detalhe só no log — %s',
    async (url) => {
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(500);
      expect(res.json<ApiErrorResponse>()).toEqual({
        statusCode: 500,
        message: INTERNAL_ERROR_MESSAGE,
      });
      expect(Object.keys(res.json()).sort()).toEqual(['message', 'statusCode']);
      expect(JSON.stringify(res.json())).not.toContain(FAILURE_DETAIL);

      // O detalhe interno existe APENAS no log do servidor.
      expect(JSON.stringify(capturedLogs)).toContain(FAILURE_DETAIL);
    },
  );
});
