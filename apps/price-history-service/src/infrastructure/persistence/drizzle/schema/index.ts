// Schema Drizzle do price-history-service — tabelas `purchases` /
// `purchase_items` (banco lógico `price_history`, dono exclusivo: RN-01/ADR 0001).
// Formato das colunas conforme PLAN.md ("Dados e ownership").
import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const purchases = pgTable('purchases', {
  // PK = completionId do evento: a própria chave de idempotência da ingestão (RN-11).
  id: uuid('id').primaryKey(),
  market: text('market').notNull(),
  purchaseDate: date('purchase_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const purchaseItems = pgTable(
  'purchase_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    // `name` como digitado (trim); `nameNormalized` é a chave de agrupamento/busca (RN-06).
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    quantity: numeric('quantity', {
      precision: 12,
      scale: 3,
      mode: 'number',
    }).notNull(),
    unit: text('unit').notNull(),
    unitPrice: numeric('unit_price', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }).notNull(),
  },
  // Agregação de menor preço e busca filtram por nome normalizado (RN-06/RN-07).
  (table) => [index('purchase_items_name_normalized_idx').on(table.nameNormalized)],
);

export type PurchaseRow = typeof purchases.$inferSelect;
export type NewPurchaseRow = typeof purchases.$inferInsert;
export type PurchaseItemRow = typeof purchaseItems.$inferSelect;
export type NewPurchaseItemRow = typeof purchaseItems.$inferInsert;
