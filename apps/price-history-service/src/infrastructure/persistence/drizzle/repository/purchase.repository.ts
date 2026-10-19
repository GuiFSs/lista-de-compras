import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, sql } from 'drizzle-orm';
import {
  PurchaseRepository,
  PurchaseSummary,
} from '../../../../application/ports/purchase-repository.port';
import {
  PriceHistoryPurchase,
  PriceHistoryPurchaseItem,
} from '../../../../domain/purchase';
import { isItemUnit } from '../../../../domain/item-unit';
import { PriceHistoryDb } from '../client';
import { DRIZZLE } from '../drizzle.provider';
import {
  PurchaseItemRow,
  PurchaseRow,
  purchaseItems,
  purchases,
} from '../schema';

/**
 * Adaptador Drizzle do port PurchaseRepository (banco lógico `price_history`).
 * O domínio e os casos de uso dependem da port, nunca deste adaptador.
 */
@Injectable()
export class DrizzlePurchaseRepository implements PurchaseRepository {
  constructor(@Inject(DRIZZLE) private readonly db: PriceHistoryDb) {}

  async insert(purchase: PriceHistoryPurchase): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(purchases)
        .values({
          id: purchase.id,
          market: purchase.market,
          purchaseDate: purchase.purchaseDate,
          createdAt: new Date(purchase.createdAt),
        })
        // Conflito de PK = reentrega do mesmo completionId; abortar sem itens
        // mantém a ingestão idempotente sem lock de leitura prévia (RN-11/AC-16).
        .onConflictDoNothing({ target: purchases.id })
        .returning({ id: purchases.id });
      if (inserted.length === 0) {
        return false;
      }
      await tx.insert(purchaseItems).values(
        purchase.items.map((item) => ({
          purchaseId: purchase.id,
          name: item.name,
          nameNormalized: item.nameNormalized,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
      );
      return true;
    });
  }

  async listSummaries(): Promise<PurchaseSummary[]> {
    // Compra sem item não existe (ingest exige ≥1 item), então inner join não
    // perde linhas e dispensa tratamento de itemCount nulo.
    const rows = await this.db
      .select({
        id: purchases.id,
        market: purchases.market,
        purchaseDate: purchases.purchaseDate,
        createdAt: purchases.createdAt,
        itemCount: sql<number>`count(${purchaseItems.id})::int`.mapWith(Number),
      })
      .from(purchases)
      .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
      .groupBy(purchases.id)
      .orderBy(desc(purchases.purchaseDate), desc(purchases.createdAt));
    return rows.map((row) => ({
      id: row.id,
      market: row.market,
      purchaseDate: row.purchaseDate,
      itemCount: row.itemCount,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<PriceHistoryPurchase | null> {
    const rows = await this.db
      .select()
      .from(purchases)
      .where(eq(purchases.id, id))
      .limit(1);
    const purchase = rows[0];
    if (!purchase) {
      return null;
    }
    // A tabela não tem coluna de posição; ordenar por id dá listagem estável
    // sem inventar ordem de exibição fora do plano.
    const itemRows = await this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, id))
      .orderBy(asc(purchaseItems.id));
    return this.toDomain(purchase, itemRows.map((row) => this.toDomainItem(row)));
  }

  async findAllWithItems(): Promise<PriceHistoryPurchase[]> {
    const purchaseRows = await this.db
      .select()
      .from(purchases)
      .orderBy(desc(purchases.purchaseDate), desc(purchases.createdAt));
    if (purchaseRows.length === 0) {
      return [];
    }
    const itemRows = await this.db.select().from(purchaseItems);
    const itemsByPurchase = new Map<string, PriceHistoryPurchaseItem[]>();
    for (const row of itemRows) {
      const items = itemsByPurchase.get(row.purchaseId) ?? [];
      items.push(this.toDomainItem(row));
      itemsByPurchase.set(row.purchaseId, items);
    }
    return purchaseRows.map((row) =>
      this.toDomain(row, itemsByPurchase.get(row.id) ?? []),
    );
  }

  private toDomain(
    row: PurchaseRow,
    items: PriceHistoryPurchaseItem[],
  ): PriceHistoryPurchase {
    return {
      id: row.id,
      market: row.market,
      purchaseDate: row.purchaseDate,
      createdAt: row.createdAt.toISOString(),
      items,
    };
  }

  private toDomainItem(row: PurchaseItemRow): PriceHistoryPurchaseItem {
    // `unit` é text no banco (CHECK fora do plano v1); linha corrompida não
    // deve virar item com unidade inválida no domínio — falhar é explícito.
    if (!isItemUnit(row.unit)) {
      throw new Error(`purchase_items.unit inválido: ${row.unit}`);
    }
    return {
      name: row.name,
      nameNormalized: row.nameNormalized,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
    };
  }
}
