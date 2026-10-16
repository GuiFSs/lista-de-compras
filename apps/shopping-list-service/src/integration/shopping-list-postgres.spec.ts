// Testes de integração com Postgres REAL (T-15).
//
// Complementam a suíte de `inject` com repositório em memória
// (`api/http/shopping-list/shopping-list.controller.spec.ts`) provando o que só
// o banco garante, com o adaptador Drizzle de verdade:
//   - AC-09: o índice único parcial barra a duplicata inserida direto no banco
//     e a chamada HTTP direta de um nome equivalente (`Café` × `CAFE`) responde
//     409 sem criar segundo item;
//   - AC-24: o estado da lista sobrevive a uma nova instância da aplicação
//     (equivale a recarregar/reabrir a PWA: o GET é refeito no serviço);
//   - AC-21: concluir remove fisicamente os comprados, não deixa tabela/registro
//     de compra e a mensageria permanece esqueleto (nenhum evento);
//   - contrato por rota (status/envelope e round-trip numérico) contra o banco.
//
// Pré-requisitos (PLAN T-15): `npm run docker:up` e
// `npx nx run shopping-list-service:db:migrate`. A tabela `shopping_list_items`
// é truncada a cada caso — banco lógico `shopping_list`, local e de dono
// exclusivo deste serviço (ADR 0001).
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { eq, isNull, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ApiErrorResponse,
  DuplicateItemErrorResponse,
  ShoppingListItem as ShoppingListItemResponse,
  ShoppingListResponse,
} from '@lista/contracts';
import { AppModule } from '../app/app.module';
import { SHOPPING_LIST_ROUTE, configureApp } from '../app/configure-app';
import { CheckoutShoppingListUseCase } from '../application';
import {
  ActiveItemNameConflictError,
  ShoppingListRepository,
} from '../application/ports/shopping-list-repository.port';
import type { ShoppingListItem as DomainShoppingListItem } from '../domain/shopping-list-item';
import * as messagingScaffold from '../infrastructure/messaging';
import type { ShoppingListDb } from '../infrastructure/persistence/drizzle/client';
import { DRIZZLE } from '../infrastructure/persistence/drizzle/drizzle.provider';
import { DrizzleShoppingListRepository } from '../infrastructure/persistence/drizzle/repository/shopping-list.repository';
import { shoppingListItems } from '../infrastructure/persistence/drizzle/schema';
import { signTestJwt } from '../test-fixtures/jwt-test-utils';

const ITEMS_ROUTE = `${SHOPPING_LIST_ROUTE}/items`;
/** UUID válido que nunca existe — id inexistente sem quebrar o cast do Postgres. */
const UNKNOWN_ID = '00000000-0000-4000-8000-0000000000ff';

const NAME_REQUIRED_MESSAGE = 'Nome do item é obrigatório';
const DUPLICATE_MESSAGE = 'Já existe um item com esse nome';
const AUTHORIZATION_MESSAGE = 'Não autorizado';

const DB_TIMEOUT_MS = 30_000;

// Conexão/primeira query podem ser lentas no Windows; o timeout padrão de 5s
// é apertado para uma suíte que abre Pool de verdade.
vi.setConfig({ testTimeout: DB_TIMEOUT_MS, hookTimeout: DB_TIMEOUT_MS });

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function createApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  // Mesmo `configureApp` de produção (prefixo `api` + CORS).
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

function dbOf(app: NestFastifyApplication): ShoppingListDb {
  return app.get<ShoppingListDb>(DRIZZLE);
}

async function closeApp(app: NestFastifyApplication): Promise<void> {
  const db = dbOf(app);
  await app.close();
  // O Pool é criado no provider e não tem `onModuleDestroy`; fechar aqui evita
  // conexões penduradas quando o caso constrói uma segunda instância (AC-24).
  await db.$client.end();
}

async function truncate(db: ShoppingListDb): Promise<void> {
  await db.execute(sql`truncate table ${shoppingListItems}`);
}

async function countRows(db: ShoppingListDb, activeOnly: boolean): Promise<number> {
  const rows = activeOnly
    ? await db
        .select({ value: sql<number>`count(*)::int` })
        .from(shoppingListItems)
        .where(isNull(shoppingListItems.removedAt))
    : await db.select({ value: sql<number>`count(*)::int` }).from(shoppingListItems);
  return rows[0].value;
}

/** Insere uma linha direto pelo schema Drizzle, fora da aplicação. */
async function insertRow(
  db: ShoppingListDb,
  row: {
    name: string;
    nameNormalized: string;
    removedAt?: Date;
    plannedQuantity?: number;
  },
): Promise<string> {
  const inserted = await db
    .insert(shoppingListItems)
    .values({
      name: row.name,
      nameNormalized: row.nameNormalized,
      plannedQuantity: row.plannedQuantity ?? null,
      removedAt: row.removedAt ?? null,
    })
    .returning({ id: shoppingListItems.id });
  return inserted[0].id;
}

/** Tabelas do schema `public` — prova que o banco não ganhou tabela nova (AC-21). */
async function publicTables(db: ShoppingListDb): Promise<string[]> {
  const result = await db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  );
  return result.rows.map((row) => row.table_name);
}

/**
 * Postgres sinaliza violação de índice único com `code: '23505'`. O Drizzle
 * embrulha o erro do driver (`DrizzleQueryError`) e guarda o original em
 * `cause` — por isso a checagem percorre a cadeia em vez de olhar só o topo.
 */
function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && current.code === '23505') {
      return true;
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

/**
 * Decora o adaptador Drizzle armando uma leitura "vencida" do nome (TOCTOU) da
 * corrida de T-18: a busca inicial não vê o item concorrente e o insert real
 * esbarra no índice único, como acontece entre dois POSTs simultâneos.
 */
class StaleReadShoppingListRepository extends ShoppingListRepository {
  private staleReads = 0;
  private conflicts = 0;

  constructor(private readonly inner: DrizzleShoppingListRepository) {
    super();
  }

  /** Estado neutro entre casos. */
  reset(): void {
    this.staleReads = 0;
    this.conflicts = 0;
  }

  /** As próximas `count` buscas de nome ignoram o item já gravado. */
  armStaleReads(count = 1): void {
    this.staleReads = count;
  }

  /** Quantas vezes o insert real colidiu no índice único (prova a corrida). */
  get uniqueConflicts(): number {
    return this.conflicts;
  }

  override findActive(): Promise<DomainShoppingListItem[]> {
    return this.inner.findActive();
  }

  override findById(id: string): Promise<DomainShoppingListItem | null> {
    return this.inner.findById(id);
  }

  override async findActiveByNameNormalized(
    nameNormalized: string,
  ): Promise<DomainShoppingListItem | null> {
    if (this.staleReads > 0) {
      this.staleReads -= 1;
      return null;
    }
    return this.inner.findActiveByNameNormalized(nameNormalized);
  }

  override async insert(item: DomainShoppingListItem): Promise<void> {
    try {
      await this.inner.insert(item);
    } catch (error) {
      if (error instanceof ActiveItemNameConflictError) {
        this.conflicts += 1;
      }
      throw error;
    }
  }

  override update(item: DomainShoppingListItem): Promise<void> {
    return this.inner.update(item);
  }

  override deleteByIds(ids: readonly string[]): Promise<void> {
    return this.inner.deleteByIds(ids);
  }
}

function findItem(
  items: readonly ShoppingListItemResponse[],
  id: string,
): ShoppingListItemResponse {
  const found = items.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Item ${id} ausente na resposta da lista`);
  }
  return found;
}

function findItemByName(
  items: readonly ShoppingListItemResponse[],
  name: string,
): ShoppingListItemResponse {
  const found = items.find((item) => item.name === name);
  if (found === undefined) {
    throw new Error(`Item "${name}" ausente na resposta da lista`);
  }
  return found;
}

describe('Integração com Postgres real — lista ativa (T-15)', () => {
  let app: NestFastifyApplication;
  let db: ShoppingListDb;
  let token: string;

  const call = (
    target: NestFastifyApplication,
    method: HttpMethod,
    url: string,
    payload?: Record<string, unknown>,
  ) =>
    target.inject({
      method,
      url,
      headers: {
        authorization: `Bearer ${token}`,
        ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { payload }),
    });

  beforeAll(async () => {
    app = await createApp();
    db = dbOf(app);
    token = await signTestJwt();
  });

  afterAll(async () => {
    // Deixa o banco local limpo (os casos truncam antes de rodar; o último
    // caso deixa as linhas que ele criou).
    await truncate(db);
    await closeApp(app);
  });

  beforeEach(async () => {
    await truncate(db);
  });

  describe('AC-09 — a unicidade do nome é garantida pelo banco', () => {
    it('chamada HTTP direta com nome equivalente responde 409 e não cria segundo item', async () => {
      const created = await call(app, 'POST', ITEMS_ROUTE, { name: '  Café  ' });
      expect(created.statusCode).toBe(201);
      const cafe = created.json<ShoppingListResponse>().items[0];
      expect(cafe.name).toBe('Café');

      for (const duplicate of ['CAFE', 'Cafe', 'café', '  cafe ']) {
        const res = await call(app, 'POST', ITEMS_ROUTE, {
          name: duplicate,
          plannedQuantity: 2,
        });

        expect(res.statusCode).toBe(409);
        expect(res.json<DuplicateItemErrorResponse>()).toEqual({
          statusCode: 409,
          message: DUPLICATE_MESSAGE,
          error: 'duplicate-item-name',
          duplicateOf: { id: cafe.id, name: 'Café' },
        });
      }

      const list = await call(app, 'GET', SHOPPING_LIST_ROUTE);
      expect(list.statusCode).toBe(200);
      const items = list.json<ShoppingListResponse>().items;
      expect(items).toHaveLength(1);
      // A tentativa recusada não somou nem alterou o existente.
      expect(items[0].plannedQuantity).toBeNull();
      expect(await countRows(db, true)).toBe(1);
    });

    it('o índice único parcial barra a duplicata inserida direto no banco', async () => {
      await insertRow(db, { name: 'Café', nameNormalized: 'cafe' });

      const failure = await insertRow(db, {
        name: 'cafe',
        nameNormalized: 'cafe',
      }).then(
        () => undefined,
        (error: unknown) => error,
      );

      expect(isUniqueViolation(failure)).toBe(true);
      expect(await countRows(db, true)).toBe(1);
    });

    it('o índice é parcial (`removed_at is null`): nome de item removido fica livre', async () => {
      await insertRow(db, {
        name: 'Café',
        nameNormalized: 'cafe',
        removedAt: new Date(),
      });
      // Convive com a linha removida (o predicado parcial ignora `removed_at`).
      await insertRow(db, { name: 'cafe', nameNormalized: 'cafe' });
      expect(await countRows(db, true)).toBe(1);
      expect(await countRows(db, false)).toBe(2);

      // Remover o ativo libera o nome de novo.
      await db
        .update(shoppingListItems)
        .set({ removedAt: new Date() })
        .where(eq(shoppingListItems.nameNormalized, 'cafe'));
      await insertRow(db, { name: 'CAFE', nameNormalized: 'cafe' });

      expect(await countRows(db, true)).toBe(1);
      expect(await countRows(db, false)).toBe(3);
    });

    it('excluir via HTTP libera o nome e recriar o item é permitido (AC-09 + AC-11)', async () => {
      const created = await call(app, 'POST', ITEMS_ROUTE, { name: 'Café' });
      const id = created.json<ShoppingListResponse>().items[0].id;

      const removed = await call(app, 'DELETE', `${ITEMS_ROUTE}/${id}`);
      expect(removed.statusCode).toBe(200);
      expect(removed.json<ShoppingListResponse>().items).toHaveLength(0);

      const recreated = await call(app, 'POST', ITEMS_ROUTE, {
        name: 'cafe',
        plannedQuantity: 1,
      });
      expect(recreated.statusCode).toBe(201);
      expect(recreated.json<ShoppingListResponse>().items).toHaveLength(1);
      expect(await countRows(db, false)).toBe(2);
    });

    it('sum-planned-quantity soma ao existente e mantém um único item (CD-02)', async () => {
      await call(app, 'POST', ITEMS_ROUTE, { name: 'Café', plannedQuantity: 3 });

      const sum = await call(app, 'POST', ITEMS_ROUTE, {
        name: ' CAFE ',
        plannedQuantity: 2,
        duplicateResolution: 'sum-planned-quantity',
      });

      expect(sum.statusCode).toBe(200);
      const items = sum.json<ShoppingListResponse>().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ name: 'Café', plannedQuantity: 5 });
      expect(await countRows(db, true)).toBe(1);
    });
  });

  describe('AC-24 — o estado da lista vive no serviço (persistência real)', () => {
    it('as mutações sobrevivem ao GET e a uma nova instância da aplicação', async () => {
      const createdArroz = await call(app, 'POST', ITEMS_ROUTE, {
        name: 'Arroz',
        plannedQuantity: 2,
        unit: 'kg',
        plannedPrice: 4.2,
      });
      const arroz = findItemByName(
        createdArroz.json<ShoppingListResponse>().items,
        'Arroz',
      );

      const createdLeite = await call(app, 'POST', ITEMS_ROUTE, {
        name: 'Leite',
        plannedQuantity: 1,
        unit: 'L',
      });
      const leite = findItemByName(
        createdLeite.json<ShoppingListResponse>().items,
        'Leite',
      );

      const createdCafe = await call(app, 'POST', ITEMS_ROUTE, { name: 'Café' });
      const cafe = findItemByName(
        createdCafe.json<ShoppingListResponse>().items,
        'Café',
      );

      const marked = await call(app, 'PUT', `${ITEMS_ROUTE}/${leite.id}/purchase`, {
        purchasedQuantity: 1.5,
        unit: 'L',
        unitPrice: 5.49,
      });
      expect(marked.statusCode).toBe(200);

      const edited = await call(app, 'PATCH', `${ITEMS_ROUTE}/${arroz.id}`, {
        plannedQuantity: 5,
        plannedPrice: 6.75,
      });
      expect(edited.statusCode).toBe(200);

      const removed = await call(app, 'DELETE', `${ITEMS_ROUTE}/${cafe.id}`);
      expect(removed.statusCode).toBe(200);

      // "Recarregar/reabrir a PWA": nova instância da aplicação (novo Pool) e o
      // GET refeito no serviço — nenhum estado é recombinado de memória local.
      const restarted = await createApp();
      try {
        const res = await restarted.inject({
          method: 'GET',
          url: SHOPPING_LIST_ROUTE,
          headers: { authorization: `Bearer ${token}` },
        });

        expect(res.statusCode).toBe(200);
        const items = res.json<ShoppingListResponse>().items;

        // Pendentes primeiro (RN-18); o comprado segue na lista até a conclusão.
        expect(items.map((item) => item.id)).toEqual([arroz.id, leite.id]);
        expect(findItem(items, arroz.id)).toMatchObject({
          name: 'Arroz',
          plannedQuantity: 5,
          unit: 'kg',
          plannedPrice: 6.75,
          purchased: null,
        });
        expect(findItem(items, leite.id).purchased).toMatchObject({
          quantity: 1.5,
          unit: 'L',
          unitPrice: 5.49,
        });
        // O excluído sai da lista ativa...
        expect(items.some((item) => item.id === cafe.id)).toBe(false);
      } finally {
        await closeApp(restarted);
      }

      // ...mas continua no banco com `removed_at` (soft delete do Desfazer).
      const removedRows = await db
        .select({ removedAt: shoppingListItems.removedAt })
        .from(shoppingListItems)
        .where(eq(shoppingListItems.id, cafe.id));
      expect(removedRows[0].removedAt).not.toBeNull();
      expect(await countRows(db, true)).toBe(2);
      expect(await countRows(db, false)).toBe(3);
    });
  });

  describe('AC-21 — concluir não grava registro nem publica evento', () => {
    it('remove fisicamente os comprados e não deixa dado de compra consultável', async () => {
      const createdPendente = await call(app, 'POST', ITEMS_ROUTE, {
        name: 'Arroz',
      });
      const pendente = findItemByName(
        createdPendente.json<ShoppingListResponse>().items,
        'Arroz',
      );

      const createdComprado = await call(app, 'POST', ITEMS_ROUTE, {
        name: 'Leite',
      });
      const comprado = findItemByName(
        createdComprado.json<ShoppingListResponse>().items,
        'Leite',
      );

      const marked = await call(
        app,
        'PUT',
        `${ITEMS_ROUTE}/${comprado.id}/purchase`,
        { purchasedQuantity: 2, unit: 'L', unitPrice: 6.99 },
      );
      expect(marked.statusCode).toBe(200);

      const checkout = await call(app, 'POST', `${SHOPPING_LIST_ROUTE}/checkout`);
      expect(checkout.statusCode).toBe(200);
      expect(checkout.json<ShoppingListResponse>().items.map((item) => item.id)).toEqual([
        pendente.id,
      ]);

      // Hard delete: nenhum dado da compra (preço pago, quantidade, data) fica.
      const compradoRows = await db
        .select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.id, comprado.id));
      expect(compradoRows).toHaveLength(0);
      expect(await countRows(db, false)).toBe(1);

      // O schema só ganha o outbox transacional (T-11/CD-06) — nenhuma tabela
      // de histórico/registro de compra vive neste banco (AC-21; o histórico é
      // do price-history-service).
      expect(await publicTables(db)).toEqual([
        'outbox_messages',
        'shopping_list_items',
      ]);
    });

    it('concluir sem comprados não remove nada (AC-20 com banco real)', async () => {
      await call(app, 'POST', ITEMS_ROUTE, { name: 'Arroz' });
      await call(app, 'POST', ITEMS_ROUTE, { name: 'Feijão' });

      const checkout = await call(app, 'POST', `${SHOPPING_LIST_ROUTE}/checkout`);

      expect(checkout.statusCode).toBe(200);
      expect(checkout.json<ShoppingListResponse>().items).toHaveLength(2);
      expect(await countRows(db, false)).toBe(2);
    });

    it('não existe rota de histórico nesta rodada (404)', async () => {
      const get = await call(app, 'GET', `${SHOPPING_LIST_ROUTE}/history`);
      expect(get.statusCode).toBe(404);

      const post = await call(app, 'POST', `${SHOPPING_LIST_ROUTE}/history`);
      expect(post.statusCode).toBe(404);
    });

    it('não há publicador de evento: mensageria é esqueleto e a conclusão só conhece o repositório', () => {
      // Tripwire: publicar exigiria implementar o adaptador de mensageria
      // (hoje `export {}`) e dar à conclusão um segundo colaborador. A ausência
      // disso é a prova executável de "não publica evento" nesta rodada.
      expect(Object.keys(messagingScaffold)).toHaveLength(0);
      expect(CheckoutShoppingListUseCase.length).toBe(1);
    });
  });

  describe('contrato por rota contra o banco real (AC-04…AC-13, AC-19, AC-20)', () => {
    it('percorre as 8 rotas devolvendo a lista ativa completa com o status do contrato', async () => {
      const empty = await call(app, 'GET', SHOPPING_LIST_ROUTE);
      expect(empty.statusCode).toBe(200);
      expect(empty.json<ShoppingListResponse>()).toEqual({ items: [] });

      // POST 201 + round-trip numérico exato de numeric(12,3)/numeric(12,2).
      const created = await call(app, 'POST', ITEMS_ROUTE, {
        name: 'Arroz',
        plannedQuantity: 2.5,
        unit: 'kg',
        plannedPrice: 3.33,
      });
      expect(created.statusCode).toBe(201);
      const arroz = findItemByName(
        created.json<ShoppingListResponse>().items,
        'Arroz',
      );
      expect(arroz).toMatchObject({
        plannedQuantity: 2.5,
        unit: 'kg',
        plannedPrice: 3.33,
        purchased: null,
      });

      const second = await call(app, 'POST', ITEMS_ROUTE, { name: 'Feijão' });
      const feijao = findItemByName(
        second.json<ShoppingListResponse>().items,
        'Feijão',
      );

      // PATCH 200.
      const patched = await call(app, 'PATCH', `${ITEMS_ROUTE}/${feijao.id}`, {
        plannedQuantity: 1,
        unit: 'pacote',
      });
      expect(patched.statusCode).toBe(200);
      expect(findItem(patched.json<ShoppingListResponse>().items, feijao.id)).toMatchObject({
        plannedQuantity: 1,
        unit: 'pacote',
      });

      // PUT purchase 200 — o comprado continua na lista.
      const purchased = await call(
        app,
        'PUT',
        `${ITEMS_ROUTE}/${arroz.id}/purchase`,
        { purchasedQuantity: 2, unit: 'kg', unitPrice: 9.99 },
      );
      expect(purchased.statusCode).toBe(200);
      expect(findItem(purchased.json<ShoppingListResponse>().items, arroz.id).purchased).toMatchObject(
        { quantity: 2, unit: 'kg', unitPrice: 9.99 },
      );

      // DELETE purchase 200 — volta a pendente e limpa os dados da compra.
      const unpurchased = await call(
        app,
        'DELETE',
        `${ITEMS_ROUTE}/${arroz.id}/purchase`,
      );
      expect(unpurchased.statusCode).toBe(200);
      expect(
        findItem(unpurchased.json<ShoppingListResponse>().items, arroz.id)
          .purchased,
      ).toBeNull();

      // DELETE 200 (soft delete) + restore 200 com os mesmos dados.
      const removed = await call(app, 'DELETE', `${ITEMS_ROUTE}/${feijao.id}`);
      expect(removed.statusCode).toBe(200);
      expect(removed.json<ShoppingListResponse>().items.map((item) => item.id)).toEqual([
        arroz.id,
      ]);

      const restored = await call(
        app,
        'POST',
        `${ITEMS_ROUTE}/${feijao.id}/restore`,
      );
      expect(restored.statusCode).toBe(200);
      expect(restored.json<ShoppingListResponse>().items.map((item) => item.id)).toEqual([
        arroz.id,
        feijao.id,
      ]);

      // POST checkout 200 — sem comprados, a lista fica como está.
      const checkout = await call(app, 'POST', `${SHOPPING_LIST_ROUTE}/checkout`);
      expect(checkout.statusCode).toBe(200);
      expect(checkout.json<ShoppingListResponse>().items.map((item) => item.id)).toEqual([
        arroz.id,
        feijao.id,
      ]);
    });

    it('erros de contrato no banco real: 400/404/409/401 com envelope canônico', async () => {
      const createdArroz = await call(app, 'POST', ITEMS_ROUTE, { name: 'Arroz' });
      const arroz = findItemByName(
        createdArroz.json<ShoppingListResponse>().items,
        'Arroz',
      );

      const createdCafe = await call(app, 'POST', ITEMS_ROUTE, { name: 'Café' });
      const cafe = findItemByName(
        createdCafe.json<ShoppingListResponse>().items,
        'Café',
      );

      const invalid = await call(app, 'POST', ITEMS_ROUTE, { name: '   ' });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json<ApiErrorResponse>()).toEqual({
        statusCode: 400,
        message: NAME_REQUIRED_MESSAGE,
      });

      const missing = await call(app, 'PATCH', `${ITEMS_ROUTE}/${UNKNOWN_ID}`, {
        name: 'Feijão',
      });
      expect(missing.statusCode).toBe(404);
      expect(missing.json<ApiErrorResponse>()).toEqual({
        statusCode: 404,
        message: 'Item não encontrado',
      });

      // Editar para o nome de OUTRO item ativo: 409 terminal (CD-13). Com o
      // adaptador real, o conflito é detectado pelo domínio antes do UPDATE —
      // o erro do índice não vaza como 500.
      const conflict = await call(app, 'PATCH', `${ITEMS_ROUTE}/${arroz.id}`, {
        name: 'cafe',
        plannedQuantity: 9,
      });
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json<DuplicateItemErrorResponse>()).toEqual({
        statusCode: 409,
        message: DUPLICATE_MESSAGE,
        error: 'duplicate-item-name',
        duplicateOf: { id: cafe.id, name: 'Café' },
      });

      const list = await call(app, 'GET', SHOPPING_LIST_ROUTE);
      // Nada foi aplicado nem somado a nenhum dos dois.
      expect(findItem(list.json<ShoppingListResponse>().items, arroz.id)).toMatchObject({
        name: 'Arroz',
        plannedQuantity: null,
      });
      expect(findItem(list.json<ShoppingListResponse>().items, cafe.id)).toMatchObject({
        name: 'Café',
      });

      // Renomear para o PRÓPRIO nome normalizado aplica (não é conflito).
      const own = await call(app, 'PATCH', `${ITEMS_ROUTE}/${cafe.id}`, {
        name: 'cafe',
      });
      expect(own.statusCode).toBe(200);
      expect(findItem(own.json<ShoppingListResponse>().items, cafe.id).name).toBe(
        'cafe',
      );

      const unauthorized = await app.inject({
        method: 'GET',
        url: SHOPPING_LIST_ROUTE,
      });
      expect(unauthorized.statusCode).toBe(401);
      expect(unauthorized.json<ApiErrorResponse>()).toEqual({
        statusCode: 401,
        message: AUTHORIZATION_MESSAGE,
      });
    });
  });
});

describe('Corrida na criação com Postgres real (T-18)', () => {
  let app: NestFastifyApplication;
  let db: ShoppingListDb;
  let token: string;
  let repository: StaleReadShoppingListRepository;

  const call = (
    target: NestFastifyApplication,
    method: HttpMethod,
    url: string,
    payload?: Record<string, unknown>,
  ) =>
    target.inject({
      method,
      url,
      headers: {
        authorization: `Bearer ${token}`,
        ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { payload }),
    });

  beforeAll(async () => {
    // Repositório real decorado: só a leitura inicial do nome é forçada a
    // "não ver" o item concorrente, disparando o `23505` do índice único.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ShoppingListRepository)
      .useFactory({
        factory: (drizzle: ShoppingListDb) => {
          repository = new StaleReadShoppingListRepository(
            new DrizzleShoppingListRepository(drizzle),
          );
          return repository;
        },
        inject: [DRIZZLE],
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    db = dbOf(app);
    token = await signTestJwt();
  });

  afterAll(async () => {
    await truncate(db);
    await closeApp(app);
  });

  beforeEach(async () => {
    await truncate(db);
    repository.reset();
  });

  it('sem resolução: corrida reconhecida → 409 canônico, sem 500 e sem duplicata', async () => {
    const winnerId = await insertRow(db, {
      name: 'Café',
      nameNormalized: 'cafe',
    });

    repository.armStaleReads();
    const res = await call(app, 'POST', ITEMS_ROUTE, {
      name: 'cafe',
      plannedQuantity: 2,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<DuplicateItemErrorResponse>()).toEqual({
      statusCode: 409,
      message: DUPLICATE_MESSAGE,
      error: 'duplicate-item-name',
      duplicateOf: { id: winnerId, name: 'Café' },
    });
    // Prova que a corrida ocorreu: o insert real colidiu no índice único.
    expect(repository.uniqueConflicts).toBe(1);
    expect(await countRows(db, true)).toBe(1);
  });

  it('com sum-planned-quantity: soma uma única vez → 200 e um único item', async () => {
    const winnerId = await insertRow(db, {
      name: 'Café',
      nameNormalized: 'cafe',
      plannedQuantity: 3,
    });

    repository.armStaleReads();
    const res = await call(app, 'POST', ITEMS_ROUTE, {
      name: ' CAFE ',
      plannedQuantity: 2,
      duplicateResolution: 'sum-planned-quantity',
    });

    expect(res.statusCode).toBe(200);
    const items = res.json<ShoppingListResponse>().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: winnerId,
      name: 'Café',
      plannedQuantity: 5,
    });
    // Soma aplicada exatamente uma vez, a partir da releitura pós-colisão.
    expect(repository.uniqueConflicts).toBe(1);
    expect(await countRows(db, true)).toBe(1);
  });

  it('dois POSTs concorrentes com o mesmo nome: nenhum 500, uma linha, sem duplicata', async () => {
    const [first, second] = await Promise.all([
      call(app, 'POST', ITEMS_ROUTE, { name: 'Café', plannedQuantity: 1 }),
      call(app, 'POST', ITEMS_ROUTE, { name: 'cafe', plannedQuantity: 1 }),
    ]);

    // Um POST vence; o outro é recusado como duplicata. Nunca 500, nunca duas linhas.
    for (const res of [first, second]) {
      expect(res.statusCode).not.toBe(500);
    }
    expect([first.statusCode, second.statusCode].sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(await countRows(db, true)).toBe(1);
  });
});
