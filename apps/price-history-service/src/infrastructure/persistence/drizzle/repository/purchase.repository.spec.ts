// Testes de integração do adaptador Drizzle com Postgres REAL (T-06).
//
// Prova o que só o banco garante: idempotência por PK `completionId`
// (RN-11/AC-16), cascade da FK de itens, round-trip numérico de
// `numeric(12,*)` e ordenação/count da listagem (RN-08).
//
// Pré-requisitos (PLAN T-06): `npm run docker:up` e
// `npx nx run price-history-service:db:migrate`. As tabelas são truncadas a
// cada caso — banco lógico `price_history`, local e de dono exclusivo deste
// serviço (ADR 0001).
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceHistoryPurchase } from '../../../../domain/purchase';
import { PriceHistoryDb, createDb } from '../client';
import { purchaseItems, purchases } from '../schema';
import { DrizzlePurchaseRepository } from './purchase.repository';

// Conexão/primeira query podem ser lentas no Windows; o timeout padrão de 5s
// é apertado para uma suíte que abre Pool de verdade.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const COMPLETION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_COMPLETION_ID = '22222222-2222-4222-8222-222222222222';

/**
 * A tabela não tem coluna de posição (fora do plano v1), então a ordem dos
 * itens no detalhe é arbitrária — os asserts ordenam os dois lados.
 */
function byNameNormalized(
  left: PriceHistoryPurchase['items'][number],
  right: PriceHistoryPurchase['items'][number],
): number {
  return left.nameNormalized < right.nameNormalized ? -1 : 1;
}

function sortedItems(purchase: PriceHistoryPurchase): PriceHistoryPurchase {
  return { ...purchase, items: [...purchase.items].sort(byNameNormalized) };
}

function buildPurchase(
  overrides: Partial<PriceHistoryPurchase> = {},
): PriceHistoryPurchase {
  return {
    id: COMPLETION_ID,
    market: 'Mercado Central',
    purchaseDate: '2026-10-01',
    createdAt: '2026-10-01T12:00:00.000Z',
    items: [
      {
        name: 'Café',
        nameNormalized: 'cafe',
        quantity: 1.5,
        unit: 'unidade',
        unitPrice: 9.9,
      },
      {
        name: 'Arroz',
        nameNormalized: 'arroz',
        quantity: 5,
        unit: 'kg',
        unitPrice: 7.5,
      },
    ],
    ...overrides,
  };
}

async function countRows(
  db: PriceHistoryDb,
  table: typeof purchases | typeof purchaseItems,
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(table);
  return rows[0].value;
}

describe('DrizzlePurchaseRepository (Postgres real)', () => {
  let db: PriceHistoryDb;
  let repository: DrizzlePurchaseRepository;

  beforeAll(() => {
    const url = process.env['PRICE_HISTORY_DATABASE_URL'];
    if (!url) {
      throw new Error('PRICE_HISTORY_DATABASE_URL não definida');
    }
    db = createDb(url);
    repository = new DrizzlePurchaseRepository(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  beforeEach(async () => {
    await db.execute(sql`truncate table ${purchases} cascade`);
  });

  it('insere compra nova e o detalhe faz round-trip completo', async () => {
    const purchase = buildPurchase();

    await expect(repository.insert(purchase)).resolves.toBe(true);

    const found = await repository.findById(purchase.id);
    if (found === null) {
      throw new Error('compra inserida não foi encontrada');
    }
    expect(sortedItems(found)).toEqual(sortedItems(purchase));
  });

  it('reentrega do mesmo completionId não duplica compra nem itens (AC-16)', async () => {
    const purchase = buildPurchase();
    await repository.insert(purchase);

    await expect(repository.insert(purchase)).resolves.toBe(false);

    expect(await countRows(db, purchases)).toBe(1);
    expect(await countRows(db, purchaseItems)).toBe(purchase.items.length);
  });

  it('listSummaries ordena por purchaseDate desc com empate por createdAt desc (RN-08)', async () => {
    await repository.insert(
      buildPurchase({
        purchaseDate: '2026-09-30',
        createdAt: '2026-09-30T10:00:00.000Z',
      }),
    );
    await repository.insert(
      buildPurchase({
        id: OTHER_COMPLETION_ID,
        purchaseDate: '2026-10-05',
        createdAt: '2026-10-05T09:00:00.000Z',
        items: [
          {
            name: 'Feijão',
            nameNormalized: 'feijao',
            quantity: 1,
            unit: 'pacote',
            unitPrice: 8,
          },
        ],
      }),
    );
    // Mesma data: o createdAt mais recente vem primeiro.
    await repository.insert(
      buildPurchase({
        id: '33333333-3333-4333-8333-333333333333',
        createdAt: '2026-10-01T18:00:00.000Z',
      }),
    );

    const summaries = await repository.listSummaries();

    expect(summaries.map((summary) => summary.id)).toEqual([
      OTHER_COMPLETION_ID,
      '33333333-3333-4333-8333-333333333333',
      COMPLETION_ID,
    ]);
    expect(summaries[0]).toEqual({
      id: OTHER_COMPLETION_ID,
      market: 'Mercado Central',
      purchaseDate: '2026-10-05',
      itemCount: 1,
      createdAt: '2026-10-05T09:00:00.000Z',
    });
    expect(summaries[1].itemCount).toBe(2);
  });

  it('findById de id inexistente devolve null', async () => {
    await expect(
      repository.findById('00000000-0000-4000-8000-0000000000ff'),
    ).resolves.toBeNull();
  });

  it('findAllWithItems devolve todas as compras com os itens agregados', async () => {
    const first = buildPurchase();
    const second = buildPurchase({
      id: OTHER_COMPLETION_ID,
      market: 'Atacadão',
      purchaseDate: '2026-10-03',
      createdAt: '2026-10-03T11:00:00.000Z',
      items: [
        {
          name: 'Cafe',
          nameNormalized: 'cafe',
          quantity: 2,
          unit: 'unidade',
          unitPrice: 8.5,
        },
      ],
    });
    await repository.insert(first);
    await repository.insert(second);

    const loaded = await repository.findAllWithItems();

    expect(loaded).toHaveLength(2);
    expect(loaded.map((purchase) => purchase.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(loaded[0].items).toEqual(second.items);
    expect(sortedItems(loaded[1])).toEqual(sortedItems(first));
  });

  it('deletar a compra em cascata remove os itens (FK)', async () => {
    const purchase = buildPurchase();
    await repository.insert(purchase);

    await db.delete(purchases).where(eq(purchases.id, purchase.id));

    expect(await countRows(db, purchases)).toBe(0);
    expect(await countRows(db, purchaseItems)).toBe(0);
  });

  it('linha com unit fora do domínio falha explícita no mapeamento', async () => {
    const purchase = buildPurchase();
    await repository.insert(purchase);
    await db.update(purchaseItems).set({ unit: 'invalida' });

    await expect(repository.findById(purchase.id)).rejects.toThrow(
      'purchase_items.unit inválido',
    );
  });
});
