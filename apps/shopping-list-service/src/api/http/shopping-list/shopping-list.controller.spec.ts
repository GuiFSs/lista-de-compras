// Testes de integração da borda HTTP da lista ativa (T-06), via Fastify `inject`.
//
// Cobertura exigida pela T-06 (PLAN.md "Estratégia de testes"):
// - cada rota no caminho de sucesso (200; `POST /items` → 201) devolvendo a
//   lista ativa completa com datas ISO-8601 (RN-18/RN-19);
// - 400 defensivo por campo (nome, quantidade > 0, preço ≥ 0, unidade) com o
//   envelope canônico (nome vazio, quantidade 0, preço negativo, unidade inválida);
// - 409 da CRIAÇÃO com `duplicateOf` e soma via `duplicateResolution`
//   (`sum-planned-quantity` → 200, sem criar segundo item — CD-02/AC-07);
// - 409 do PATCH (edição) como conflito TERMINAL: item inalterado, nada somado
//   (CD-13/AC-08);
// - 404 (id inexistente/removido) e idempotência de `DELETE` e `DELETE …/purchase`;
// - 401 uniforme sem token (guard global, ADR 0007);
// - CORS/preflight da origem da PWA (ADR 0009) e ausência de rota de histórico (AC-21);
// - 500 com envelope canônico, sem detalhe interno no corpo (detalhe só no log).
//
// O harness troca o port `ShoppingListRepository` por um repositório em memória
// (reusa `InMemoryShoppingListRepository`) — não depende do banco. Um segundo app
// com repositório que falha prova o 500 canônico.
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiErrorResponse,
  DuplicateItemErrorResponse,
  ShoppingListResponse,
} from '@lista/contracts';
import { AppModule } from '../../../app/app.module';
import {
  MALFORMED_JSON_MESSAGE,
  SHOPPING_LIST_ROUTE,
  configureApp,
} from '../../../app/configure-app';
import { ShoppingListRepository } from '../../../application/ports/shopping-list-repository.port';
import { InMemoryShoppingListRepository } from '../../../application/use-cases/testing/in-memory-shopping-list-repository';
import {
  BASE_TIME,
  LATER,
  makeItem,
  purchasedItem,
} from '../../../application/use-cases/testing/item-fixtures';
import type { ShoppingListItem } from '../../../domain/shopping-list-item';
import { signTestJwt } from '../../../test-fixtures/jwt-test-utils';

const ITEMS_ROUTE = `${SHOPPING_LIST_ROUTE}/items`;
const SECOND = new Date('2026-01-02T00:00:00.000Z');

const ARROZ_ID = 'item-arroz';
const CAFE_ID = 'item-cafe';
const LEITE_ID = 'item-leite';
const UNKNOWN_ID = '00000000-0000-4000-8000-0000000000ff';

const NAME_REQUIRED_MESSAGE = 'Nome do item é obrigatório';
const QUANTITY_MESSAGE = 'Quantidade deve ser maior que zero';
const PRICE_MESSAGE = 'Preço não pode ser negativo';
const UNIT_MESSAGE = 'Unidade inválida';
const NOT_FOUND_MESSAGE = 'Item não encontrado';
const DUPLICATE_MESSAGE = 'Já existe um item com esse nome';
const INTERNAL_ERROR_MESSAGE = 'Erro interno';
const AUTHORIZATION_MESSAGE = 'Não autorizado';

const FAILURE_DETAIL = 'falha simulada no banco de dados (0xDEADBEEF)';

const NAME_REQUIRED_BODY: ApiErrorResponse = {
  statusCode: 400,
  message: NAME_REQUIRED_MESSAGE,
};
const QUANTITY_BODY: ApiErrorResponse = {
  statusCode: 400,
  message: QUANTITY_MESSAGE,
};
const PRICE_BODY: ApiErrorResponse = {
  statusCode: 400,
  message: PRICE_MESSAGE,
};
const UNIT_BODY: ApiErrorResponse = {
  statusCode: 400,
  message: UNIT_MESSAGE,
};
const NOT_FOUND_BODY: ApiErrorResponse = {
  statusCode: 404,
  message: NOT_FOUND_MESSAGE,
};
const INTERNAL_ERROR_BODY: ApiErrorResponse = {
  statusCode: 500,
  message: INTERNAL_ERROR_MESSAGE,
};

/**
 * Repositório de teste com seed trocável a cada caso. Delega para o
 * `InMemoryShoppingListRepository` (o mapa dele é privado) — `reset` recria a
 * instância interna, então os casos de uso seguem usando este delegador.
 */
class ResettableShoppingListRepository extends ShoppingListRepository {
  private current = new InMemoryShoppingListRepository();

  reset(seed: readonly ShoppingListItem[] = []): void {
    this.current = new InMemoryShoppingListRepository(seed);
  }

  override findActive(): Promise<ShoppingListItem[]> {
    return this.current.findActive();
  }

  override findById(id: string): Promise<ShoppingListItem | null> {
    return this.current.findById(id);
  }

  override findActiveByNameNormalized(
    nameNormalized: string,
  ): Promise<ShoppingListItem | null> {
    return this.current.findActiveByNameNormalized(nameNormalized);
  }

  override insert(item: ShoppingListItem): Promise<void> {
    return this.current.insert(item);
  }

  override update(item: ShoppingListItem): Promise<void> {
    return this.current.update(item);
  }

  override deleteByIds(ids: readonly string[]): Promise<void> {
    return this.current.deleteByIds(ids);
  }

  /** Leitura direta (inclui removidos) para provar o estado persistido. */
  stored(id: string): ShoppingListItem | null {
    return this.current.stored(id);
  }
}

/** Repositório que lança — prova o 500 canônico sem vazar o detalhe. */
class FailingShoppingListRepository extends ShoppingListRepository {
  private fail(): never {
    throw new Error(FAILURE_DETAIL);
  }

  override async findActive(): Promise<ShoppingListItem[]> {
    return this.fail();
  }

  override async findById(): Promise<ShoppingListItem | null> {
    return this.fail();
  }

  override async findActiveByNameNormalized(): Promise<ShoppingListItem | null> {
    return this.fail();
  }

  override async insert(): Promise<void> {
    this.fail();
  }

  override async update(): Promise<void> {
    this.fail();
  }

  override async deleteByIds(): Promise<void> {
    this.fail();
  }
}

describe('Borda HTTP da lista ativa — integração via inject (T-06)', () => {
  let app: NestFastifyApplication;
  let repository: ResettableShoppingListRepository;
  let token: string;

  const auth = (): { authorization: string } => ({
    authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    repository = new ResettableShoppingListRepository();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ShoppingListRepository)
      .useValue(repository)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    // Mesmo `configureApp` de produção (prefixo `api` + CORS).
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    token = await signTestJwt();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.reset();
  });

  describe('GET /api/shopping-list (RN-18/RN-19/AC-18/AC-24)', () => {
    it('200 — lista ativa na ordem pendentes→comprados e datas em ISO-8601', async () => {
      repository.reset([
        purchasedItem({ id: LEITE_ID, name: 'Leite', createdAt: LATER }),
        makeItem({ id: CAFE_ID, name: 'Café', createdAt: SECOND }),
        makeItem({ id: ARROZ_ID, name: 'Arroz', createdAt: BASE_TIME }),
      ]);

      const res = await app.inject({
        method: 'GET',
        url: SHOPPING_LIST_ROUTE,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ShoppingListResponse>();
      expect(body.items.map((item) => item.id)).toEqual([
        ARROZ_ID,
        CAFE_ID,
        LEITE_ID,
      ]);

      const first = body.items[0];
      // Shape exato do contrato (T-02): sem campos extras.
      expect(Object.keys(first).sort()).toEqual([
        'createdAt',
        'id',
        'name',
        'plannedPrice',
        'plannedQuantity',
        'purchased',
        'unit',
        'updatedAt',
      ]);
      expect(new Date(first.createdAt).toISOString()).toBe(first.createdAt);
      expect(body.items[2].purchased).toMatchObject({
        quantity: 2,
        unit: 'kg',
        unitPrice: 9.9,
      });
      expect(body.items[2].purchased?.purchasedAt).toBe(
        BASE_TIME.toISOString(),
      );
    });

    it('200 — lista vazia devolve `items: []`', async () => {
      const res = await app.inject({
        method: 'GET',
        url: SHOPPING_LIST_ROUTE,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>()).toEqual({ items: [] });
    });
  });

  describe('POST /api/shopping-list/items (RN-03/RN-04/AC-04/AC-07/AC-09)', () => {
    it('201 — cria o item só com o nome (opcionais vazios) e devolve a lista', async () => {
      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: { name: '  Café  ' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<ShoppingListResponse>();
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toMatchObject({
        name: 'Café',
        plannedQuantity: null,
        unit: null,
        plannedPrice: null,
        purchased: null,
      });
    });

    it('201 — cria o item com todos os campos opcionais', async () => {
      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: {
          name: 'Arroz',
          plannedQuantity: 2,
          unit: 'kg',
          plannedPrice: 5.5,
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json<ShoppingListResponse>().items[0]).toMatchObject({
        name: 'Arroz',
        plannedQuantity: 2,
        unit: 'kg',
        plannedPrice: 5.5,
      });
    });

    it('201 — `sum-planned-quantity` sem item existente cria normalmente', async () => {
      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: {
          name: 'Café',
          plannedQuantity: 1,
          duplicateResolution: 'sum-planned-quantity',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json<ShoppingListResponse>().items).toHaveLength(1);
    });

    const invalidCreateBodies: Array<
      [string, Record<string, unknown> | undefined, ApiErrorResponse]
    > = [
      ['sem corpo', undefined, NAME_REQUIRED_BODY],
      ['corpo vazio', {}, NAME_REQUIRED_BODY],
      ['nome só espaços', { name: '   ' }, NAME_REQUIRED_BODY],
      ['nome não-string', { name: 123 }, NAME_REQUIRED_BODY],
      [
        'quantidade zero',
        { name: 'Arroz', plannedQuantity: 0 },
        QUANTITY_BODY,
      ],
      [
        'quantidade negativa',
        { name: 'Arroz', plannedQuantity: -1 },
        QUANTITY_BODY,
      ],
      [
        'quantidade não-numérica',
        { name: 'Arroz', plannedQuantity: '2' },
        QUANTITY_BODY,
      ],
      ['preço negativo', { name: 'Arroz', plannedPrice: -0.01 }, PRICE_BODY],
      ['unidade inválida', { name: 'Arroz', unit: 'litro' }, UNIT_BODY],
    ];

    it.each(invalidCreateBodies)(
      '400 — criação inválida (%s) usa o envelope canônico',
      async (_label, payload, expected) => {
        const res = await app.inject({
          method: 'POST',
          url: ITEMS_ROUTE,
          headers: auth(),
          payload,
        });

        expect(res.statusCode).toBe(400);
        expect(res.json<ApiErrorResponse>()).toEqual(expected);
        expect(Object.keys(res.json()).sort()).toEqual([
          'message',
          'statusCode',
        ]);
      },
    );

    it('400 — JSON malformado usa o envelope canônico, sem detalhe técnico do parser', async () => {
      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: { ...auth(), 'content-type': 'application/json' },
        payload: '{ "name":',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json<ApiErrorResponse>()).toEqual({
        statusCode: 400,
        message: MALFORMED_JSON_MESSAGE,
      });
      expect(Object.keys(res.json()).sort()).toEqual([
        'message',
        'statusCode',
      ]);
      // Paridade com o auth-service: nem a mensagem em inglês nem o código do
      // parser do Fastify vazam para o cliente.
      const body = JSON.stringify(res.json<ApiErrorResponse>());
      expect(body).not.toContain('not valid JSON');
      expect(body).not.toContain('FST_ERR');
    });

    it('400 — JSON malformado no PATCH também usa o envelope canônico', async () => {
      repository.reset([makeItem({ id: ARROZ_ID, name: 'Arroz' })]);

      const res = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}`,
        headers: { ...auth(), 'content-type': 'application/json' },
        payload: '{ "name": ',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json<ApiErrorResponse>()).toEqual({
        statusCode: 400,
        message: MALFORMED_JSON_MESSAGE,
      });
    });

    it('409 — nome existente com reject (default) traz `duplicateOf` e não cria segundo item', async () => {
      repository.reset([
        makeItem({ id: CAFE_ID, name: 'Café', plannedQuantity: 3 }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: { name: 'cafe', plannedQuantity: 2 },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json<DuplicateItemErrorResponse>()).toEqual({
        statusCode: 409,
        message: DUPLICATE_MESSAGE,
        error: 'duplicate-item-name',
        duplicateOf: { id: CAFE_ID, name: 'Café' },
      });
      expect(repository.stored(CAFE_ID)?.plannedQuantity).toBe(3);
      expect(await repository.findActive()).toHaveLength(1);
    });

    it('200 — `sum-planned-quantity` soma ao existente e devolve a lista (CD-02)', async () => {
      repository.reset([
        makeItem({ id: CAFE_ID, name: 'Café', plannedQuantity: 3 }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: {
          name: 'CAFE ',
          plannedQuantity: 2,
          duplicateResolution: 'sum-planned-quantity',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ShoppingListResponse>();
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toMatchObject({
        id: CAFE_ID,
        name: 'Café',
        plannedQuantity: 5,
      });
    });

    it('200 — soma sem quantidade informada mantém o existente como estava', async () => {
      repository.reset([
        makeItem({ id: CAFE_ID, name: 'Café', plannedQuantity: 3 }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: {
          name: 'cafe',
          duplicateResolution: 'sum-planned-quantity',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(repository.stored(CAFE_ID)?.plannedQuantity).toBe(3);
    });

    it('409 — `duplicateResolution` desconhecido cai no comportamento terminal de criação', async () => {
      repository.reset([makeItem({ id: CAFE_ID, name: 'Café' })]);

      const res = await app.inject({
        method: 'POST',
        url: ITEMS_ROUTE,
        headers: auth(),
        payload: { name: 'cafe', duplicateResolution: 'qualquer-coisa' },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json<DuplicateItemErrorResponse>().duplicateOf).toEqual({
        id: CAFE_ID,
        name: 'Café',
      });
    });
  });

  describe('PATCH /api/shopping-list/items/{id} (RN-03/RN-04/CD-13/AC-08/AC-10)', () => {
    it('200 — edita campos e devolve a lista atualizada', async () => {
      repository.reset([
        makeItem({ id: ARROZ_ID, name: 'Arroz', plannedQuantity: 1 }),
      ]);

      const res = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}`,
        headers: auth(),
        payload: { plannedQuantity: 4, unit: 'kg', plannedPrice: 3.5 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items[0]).toMatchObject({
        id: ARROZ_ID,
        plannedQuantity: 4,
        unit: 'kg',
        plannedPrice: 3.5,
      });
    });

    it('200 — `null` limpa os opcionais (semântica do PATCH)', async () => {
      repository.reset([
        makeItem({
          id: ARROZ_ID,
          name: 'Arroz',
          plannedQuantity: 4,
          unit: 'kg',
          plannedPrice: 3.5,
        }),
      ]);

      const res = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}`,
        headers: auth(),
        payload: { plannedQuantity: null, unit: null, plannedPrice: null },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items[0]).toMatchObject({
        plannedQuantity: null,
        unit: null,
        plannedPrice: null,
      });
    });

    it('200 — renomear para o próprio nome normalizado não é conflito', async () => {
      repository.reset([makeItem({ id: CAFE_ID, name: 'Café' })]);

      const res = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${CAFE_ID}`,
        headers: auth(),
        payload: { name: 'cafe' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items[0]).toMatchObject({
        id: CAFE_ID,
        name: 'cafe',
      });
    });

    it('409 — nome de outro item ativo é conflito terminal: item inalterado e nada somado (CD-13)', async () => {
      repository.reset([
        makeItem({ id: ARROZ_ID, name: 'Arroz', plannedQuantity: 1, createdAt: BASE_TIME }),
        makeItem({ id: CAFE_ID, name: 'Café', plannedQuantity: 3, createdAt: SECOND }),
      ]);

      const res = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}`,
        headers: auth(),
        payload: { name: 'cafe', plannedQuantity: 9 },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json<DuplicateItemErrorResponse>()).toEqual({
        statusCode: 409,
        message: DUPLICATE_MESSAGE,
        error: 'duplicate-item-name',
        duplicateOf: { id: CAFE_ID, name: 'Café' },
      });
      // O item editado permanece como estava e o outro não recebe soma.
      expect(repository.stored(ARROZ_ID)).toMatchObject({
        name: 'Arroz',
        plannedQuantity: 1,
      });
      expect(repository.stored(CAFE_ID)).toMatchObject({
        name: 'Café',
        plannedQuantity: 3,
      });
    });

    const invalidPatchBodies: Array<
      [string, Record<string, unknown>, ApiErrorResponse]
    > = [
      ['nome só espaços', { name: '   ' }, NAME_REQUIRED_BODY],
      ['quantidade zero', { plannedQuantity: 0 }, QUANTITY_BODY],
      ['preço negativo', { plannedPrice: -1 }, PRICE_BODY],
      ['unidade inválida', { unit: 'litro' }, UNIT_BODY],
    ];

    it.each(invalidPatchBodies)(
      '400 — edição inválida (%s) usa o envelope canônico',
      async (_label, payload, expected) => {
        repository.reset([makeItem({ id: ARROZ_ID, name: 'Arroz' })]);

        const res = await app.inject({
          method: 'PATCH',
          url: `${ITEMS_ROUTE}/${ARROZ_ID}`,
          headers: auth(),
          payload,
        });

        expect(res.statusCode).toBe(400);
        expect(res.json<ApiErrorResponse>()).toEqual(expected);
      },
    );

    it('404 — id inexistente e id removido', async () => {
      repository.reset([
        makeItem({ id: CAFE_ID, name: 'Café', removedAt: LATER }),
      ]);

      const missing = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${UNKNOWN_ID}`,
        headers: auth(),
        payload: { name: 'Arroz' },
      });
      expect(missing.statusCode).toBe(404);
      expect(missing.json<ApiErrorResponse>()).toEqual(NOT_FOUND_BODY);

      const removed = await app.inject({
        method: 'PATCH',
        url: `${ITEMS_ROUTE}/${CAFE_ID}`,
        headers: auth(),
        payload: { name: 'Arroz' },
      });
      expect(removed.statusCode).toBe(404);
      expect(removed.json<ApiErrorResponse>()).toEqual(NOT_FOUND_BODY);
    });
  });

  describe('DELETE /api/shopping-list/items/{id} (RN-07/RN-08/AC-11)', () => {
    it('200 — exclui (soft delete) e devolve a lista sem o item', async () => {
      repository.reset([
        makeItem({ id: ARROZ_ID, name: 'Arroz', createdAt: BASE_TIME }),
        makeItem({ id: CAFE_ID, name: 'Café', createdAt: SECOND }),
      ]);

      const res = await app.inject({
        method: 'DELETE',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items.map((i) => i.id)).toEqual([
        CAFE_ID,
      ]);
      // Soft delete: a linha permanece (alimenta o Desfazer).
      expect(repository.stored(ARROZ_ID)?.removedAt).not.toBeNull();
    });

    it('200 — idempotente: excluir id inexistente devolve a lista como está', async () => {
      repository.reset([makeItem({ id: CAFE_ID, name: 'Café' })]);

      const res = await app.inject({
        method: 'DELETE',
        url: `${ITEMS_ROUTE}/${UNKNOWN_ID}`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items.map((i) => i.id)).toEqual([
        CAFE_ID,
      ]);
    });
  });

  describe('POST /api/shopping-list/items/{id}/restore (RN-08)', () => {
    it('200 — restaura com os mesmos dados, inclusive o estado comprado', async () => {
      repository.reset([
        {
          ...purchasedItem({ id: LEITE_ID, name: 'Leite' }),
          removedAt: LATER,
        },
      ]);

      const res = await app.inject({
        method: 'POST',
        url: `${ITEMS_ROUTE}/${LEITE_ID}/restore`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items[0]).toMatchObject({
        id: LEITE_ID,
        name: 'Leite',
      });
      expect(res.json<ShoppingListResponse>().items[0].purchased).not.toBeNull();
    });

    it('409 — nome retomado por outro item ativo recusa a restauração', async () => {
      repository.reset([
        { ...makeItem({ id: UNKNOWN_ID, name: 'Café' }), removedAt: LATER },
        makeItem({ id: CAFE_ID, name: 'cafe' }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: `${ITEMS_ROUTE}/${UNKNOWN_ID}/restore`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(409);
      expect(res.json<DuplicateItemErrorResponse>().duplicateOf).toEqual({
        id: CAFE_ID,
        name: 'cafe',
      });
      // O item removido segue fora da lista.
      expect(repository.stored(UNKNOWN_ID)?.removedAt).not.toBeNull();
    });

    it('404 — id nunca existiu', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${ITEMS_ROUTE}/${UNKNOWN_ID}/restore`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json<ApiErrorResponse>()).toEqual(NOT_FOUND_BODY);
    });
  });

  describe('PUT /api/shopping-list/items/{id}/purchase (RN-09/RN-11/AC-12)', () => {
    it('200 — marca como comprado e o item continua na lista', async () => {
      repository.reset([makeItem({ id: ARROZ_ID, name: 'Arroz' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}/purchase`,
        headers: auth(),
        payload: { purchasedQuantity: 2, unit: 'kg', unitPrice: 9.9 },
      });

      expect(res.statusCode).toBe(200);
      const item = res.json<ShoppingListResponse>().items[0];
      expect(item.id).toBe(ARROZ_ID);
      expect(item.purchased).toMatchObject({
        quantity: 2,
        unit: 'kg',
        unitPrice: 9.9,
      });
      expect(item.purchased?.purchasedAt).toBeTypeOf('string');
    });

    const invalidPurchaseBodies: Array<
      [string, Record<string, unknown> | undefined, ApiErrorResponse]
    > = [
      ['sem corpo', undefined, QUANTITY_BODY],
      ['sem quantidade', { unit: 'kg', unitPrice: 1 }, QUANTITY_BODY],
      ['quantidade zero', { purchasedQuantity: 0, unit: 'kg', unitPrice: 1 }, QUANTITY_BODY],
      ['sem preço', { purchasedQuantity: 2, unit: 'kg' }, PRICE_BODY],
      ['preço negativo', { purchasedQuantity: 2, unit: 'kg', unitPrice: -1 }, PRICE_BODY],
      ['sem unidade', { purchasedQuantity: 2, unitPrice: 1 }, UNIT_BODY],
      ['unidade inválida', { purchasedQuantity: 2, unit: 'litro', unitPrice: 1 }, UNIT_BODY],
    ];

    it.each(invalidPurchaseBodies)(
      '400 — marcação inválida (%s) usa o envelope canônico',
      async (_label, payload, expected) => {
        repository.reset([makeItem({ id: ARROZ_ID, name: 'Arroz' })]);

        const res = await app.inject({
          method: 'PUT',
          url: `${ITEMS_ROUTE}/${ARROZ_ID}/purchase`,
          headers: auth(),
          payload,
        });

        expect(res.statusCode).toBe(400);
        expect(res.json<ApiErrorResponse>()).toEqual(expected);
      },
    );

    it('404 — id inexistente', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `${ITEMS_ROUTE}/${UNKNOWN_ID}/purchase`,
        headers: auth(),
        payload: { purchasedQuantity: 2, unit: 'kg', unitPrice: 9.9 },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json<ApiErrorResponse>()).toEqual(NOT_FOUND_BODY);
    });
  });

  describe('DELETE /api/shopping-list/items/{id}/purchase (RN-12)', () => {
    it('200 — desmarca e limpa os dados da compra', async () => {
      repository.reset([purchasedItem({ id: LEITE_ID, name: 'Leite' })]);

      const res = await app.inject({
        method: 'DELETE',
        url: `${ITEMS_ROUTE}/${LEITE_ID}/purchase`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items[0].purchased).toBeNull();
    });

    it('200 — idempotente em item já pendente', async () => {
      repository.reset([makeItem({ id: ARROZ_ID, name: 'Arroz' })]);

      const res = await app.inject({
        method: 'DELETE',
        url: `${ITEMS_ROUTE}/${ARROZ_ID}/purchase`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items[0].purchased).toBeNull();
    });

    it('404 — id inexistente', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `${ITEMS_ROUTE}/${UNKNOWN_ID}/purchase`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json<ApiErrorResponse>()).toEqual(NOT_FOUND_BODY);
    });
  });

  describe('POST /api/shopping-list/checkout (RN-14…RN-16/AC-19…AC-21)', () => {
    it('200 — remove (hard delete) só os comprados e devolve os pendentes', async () => {
      repository.reset([
        makeItem({ id: ARROZ_ID, name: 'Arroz', createdAt: BASE_TIME }),
        makeItem({ id: CAFE_ID, name: 'Café', createdAt: SECOND }),
        purchasedItem({ id: LEITE_ID, name: 'Leite', createdAt: LATER }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: `${SHOPPING_LIST_ROUTE}/checkout`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items.map((i) => i.id)).toEqual([
        ARROZ_ID,
        CAFE_ID,
      ]);
      // Conclusão é DELETE físico: nada do comprado permanece armazenado.
      expect(repository.stored(LEITE_ID)).toBeNull();
    });

    it('200 — sem itens comprados mantém a lista exatamente como estava', async () => {
      repository.reset([
        makeItem({ id: ARROZ_ID, name: 'Arroz', createdAt: BASE_TIME }),
        makeItem({ id: CAFE_ID, name: 'Café', createdAt: SECOND }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: `${SHOPPING_LIST_ROUTE}/checkout`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<ShoppingListResponse>().items.map((i) => i.id)).toEqual([
        ARROZ_ID,
        CAFE_ID,
      ]);
    });
  });

  describe('401 — guard global de JWT (ADR 0007)', () => {
    const protectedRoutes: Array<
      [string, 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT', string]
    > = [
      ['GET lista', 'GET', SHOPPING_LIST_ROUTE],
      ['POST criar', 'POST', ITEMS_ROUTE],
      ['PATCH editar', 'PATCH', `${ITEMS_ROUTE}/${UNKNOWN_ID}`],
      ['DELETE excluir', 'DELETE', `${ITEMS_ROUTE}/${UNKNOWN_ID}`],
      ['POST restaurar', 'POST', `${ITEMS_ROUTE}/${UNKNOWN_ID}/restore`],
      ['PUT comprar', 'PUT', `${ITEMS_ROUTE}/${UNKNOWN_ID}/purchase`],
      ['DELETE desmarcar', 'DELETE', `${ITEMS_ROUTE}/${UNKNOWN_ID}/purchase`],
      ['POST concluir', 'POST', `${SHOPPING_LIST_ROUTE}/checkout`],
    ];

    it.each(protectedRoutes)(
      '%s — sem token responde 401 uniforme',
      async (_label, method, url) => {
        const res = await app.inject({ method, url });

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

    it('401 — token inválido também é 401 uniforme', async () => {
      const res = await app.inject({
        method: 'GET',
        url: SHOPPING_LIST_ROUTE,
        headers: { authorization: 'Bearer nao-e-um-jwt' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json<ApiErrorResponse>()).toEqual({
        statusCode: 401,
        message: AUTHORIZATION_MESSAGE,
      });
    });
  });

  describe('CORS e rota inexistente (ADR 0009/AC-21)', () => {
    it('OPTIONS — preflight da origem da PWA é aceito', async () => {
      const preflight = await app.inject({
        method: 'OPTIONS',
        url: SHOPPING_LIST_ROUTE,
        headers: {
          origin: 'http://localhost:4200',
          'access-control-request-method': 'POST',
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
      expect(allowMethods).toEqual(
        expect.arrayContaining(['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']),
      );
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

    it('origem permitida recebe header; origem desconhecida não', async () => {
      const allowed = await app.inject({
        method: 'GET',
        url: SHOPPING_LIST_ROUTE,
        headers: { ...auth(), origin: 'http://localhost:4200' },
      });
      expect(allowed.statusCode).toBe(200);
      expect(allowed.headers['access-control-allow-origin']).toBe(
        'http://localhost:4200',
      );

      const denied = await app.inject({
        method: 'GET',
        url: SHOPPING_LIST_ROUTE,
        headers: { ...auth(), origin: 'https://evil.example' },
      });
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('404 — não existe rota de histórico nesta rodada', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${SHOPPING_LIST_ROUTE}/history`,
        headers: auth(),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});

describe('Borda HTTP da lista ativa — 500 canônico (T-06)', () => {
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
      .overrideProvider(ShoppingListRepository)
      .useValue(new FailingShoppingListRepository())
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

  it('500 — envelope canônico sem detalhe interno; detalhe só no log', async () => {
    const res = await app.inject({
      method: 'GET',
      url: SHOPPING_LIST_ROUTE,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json<ApiErrorResponse>()).toEqual(INTERNAL_ERROR_BODY);
    expect(Object.keys(res.json()).sort()).toEqual(['message', 'statusCode']);
    expect(JSON.stringify(res.json())).not.toContain(FAILURE_DETAIL);

    // O detalhe interno existe APENAS no log do servidor.
    expect(JSON.stringify(capturedLogs)).toContain(FAILURE_DETAIL);
  });

  it('500 — falha inesperada numa mutação também usa o envelope canônico', async () => {
    const res = await app.inject({
      method: 'POST',
      url: ITEMS_ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Arroz' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json<ApiErrorResponse>()).toEqual(INTERNAL_ERROR_BODY);
    expect(JSON.stringify(res.json())).not.toContain(FAILURE_DETAIL);
  });
});
