// Schema Drizzle do shopping-list-service — banco lógico `shopping_list`
// (dono exclusivo: shopping-list-service — ADR 0001).
//
// `shopping_list_items` é a lista ativa desta rodada (RN-01): não há entidade
// "lista" nem histórico. `removed_at` é o soft delete do excluir + Desfazer
// (RN-08); a conclusão da compra remove as linhas compradas fisicamente (AC-21).
// `outbox_messages` é o transactional outbox do evento de conclusão (CD-06):
// intenção de publicar gravada na MESMA transação do DELETE — não é histórico
// de preços, que vive no banco do price-history-service.
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
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

export const outboxMessages = pgTable(
  'outbox_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Chave de negócio do evento (uuid do completionId, não aleatório da tabela):
    // uma conclusão gera no máximo uma mensagem — unicidade barra reprocessos.
    completionId: uuid('completion_id').notNull(),
    eventType: text('event_type').notNull(),
    eventVersion: integer('event_version').notNull(),
    // Envelope v1 completo: o publisher serializa sem remontar. event_type/
    // event_version espelham o envelope para consulta sem ler o jsonb.
    payload: jsonb('payload').$type<PurchaseCompletedEventV1>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // null ⇒ pendente de publicação (predicado do índice parcial abaixo).
    publishedAt: timestamp('published_at', { withTimezone: true }),
    // Tentativas de publicação que falharam; o sucesso só preenche published_at.
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [
    uniqueIndex('outbox_messages_completion_id_unique').on(table.completionId),
    // Varredura do publisher (T-12): só as pendentes, em ordem de criação.
    index('outbox_messages_pending_created_at_idx')
      .on(table.createdAt)
      .where(sql`${table.publishedAt} is null`),
  ],
);

export type OutboxMessageRow = typeof outboxMessages.$inferSelect;
export type NewOutboxMessageRow = typeof outboxMessages.$inferInsert;
