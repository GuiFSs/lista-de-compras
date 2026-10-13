// Schema Drizzle do shopping-list-service — tabela `shopping_list_items`
// (banco lógico `shopping_list`, dono exclusivo: shopping-list-service — ADR 0001).
//
// A tabela é a lista ativa desta rodada (RN-01): não há entidade "lista" nem
// histórico. `removed_at` é o soft delete do excluir + Desfazer (RN-08); a
// conclusão da compra remove as linhas compradas fisicamente (AC-21).
import { sql } from 'drizzle-orm';
import {
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const shoppingListItems = pgTable(
  'shopping_list_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Como digitado, apenas com trim nas extremidades.
    name: text('name').notNull(),
    // Chave de unicidade da lista ativa; derivada só no domínio (RN-02/CD-12).
    nameNormalized: text('name_normalized').notNull(),
    plannedQuantity: numeric('planned_quantity', {
      precision: 12,
      scale: 3,
      mode: 'number',
    }),
    unit: text('unit'),
    plannedPrice: numeric('planned_price', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    purchasedQuantity: numeric('purchased_quantity', {
      precision: 12,
      scale: 3,
      mode: 'number',
    }),
    purchasedUnit: text('purchased_unit'),
    unitPrice: numeric('unit_price', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // AC-09: no máximo um item ativo por nome normalizado; remover libera o nome
    // para um item novo (o predicado parcial ignora as linhas com `removed_at`).
    uniqueIndex('shopping_list_items_name_normalized_active_unique')
      .on(table.nameNormalized)
      .where(sql`${table.removedAt} is null`),
  ],
);

export type ShoppingListItemRow = typeof shoppingListItems.$inferSelect;
export type NewShoppingListItemRow = typeof shoppingListItems.$inferInsert;
