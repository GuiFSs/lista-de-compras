// Adaptador do port ShoppingListRepository usando Drizzle (banco `shopping_list`).
//
// O shopping-list-service é dono exclusivo destes dados (ADR 0001); nenhum
// outro serviço lê esta tabela. O domínio e os casos de uso dependem do port,
// não deste adaptador.
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
  ActiveItemNameConflictError,
  ShoppingListRepository,
} from '../../../../application/ports/shopping-list-repository.port';
import type { ShoppingListItem } from '../../../../domain/shopping-list-item';
import type { ShoppingListDb } from '../client';
import { DRIZZLE } from '../drizzle.provider';
import { shoppingListItems } from '../schema';
import { toDomainItem, toRowValues, toUpdateValues } from './item-row.mapper';

@Injectable()
export class DrizzleShoppingListRepository implements ShoppingListRepository {
  constructor(@Inject(DRIZZLE) private readonly db: ShoppingListDb) {}

  async findActive(): Promise<ShoppingListItem[]> {
    const rows = await this.db
      .select()
      .from(shoppingListItems)
      .where(isNull(shoppingListItems.removedAt))
      .orderBy(asc(shoppingListItems.createdAt), asc(shoppingListItems.id));
    return rows.map(toDomainItem);
  }

  async findById(id: string): Promise<ShoppingListItem | null> {
    const rows = await this.db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.id, id))
      .limit(1);
    const row = rows[0];
    return row ? toDomainItem(row) : null;
  }

  async findActiveByNameNormalized(
    nameNormalized: string,
  ): Promise<ShoppingListItem | null> {
    const rows = await this.db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          isNull(shoppingListItems.removedAt),
          eq(shoppingListItems.nameNormalized, nameNormalized),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toDomainItem(row) : null;
  }

  async insert(item: ShoppingListItem): Promise<void> {
    try {
      await this.db.insert(shoppingListItems).values(toRowValues(item));
    } catch (error) {
      // A tabela só tem este índice único além da PK (uuid aleatório); traduzir
      // `23505` para o erro de domínio evita vazar o driver para a aplicação.
      if (isUniqueViolation(error)) {
        throw new ActiveItemNameConflictError();
      }
      throw error;
    }
  }

  async update(item: ShoppingListItem): Promise<void> {
    await this.db
      .update(shoppingListItems)
      .set(toUpdateValues(item))
      .where(eq(shoppingListItems.id, item.id));
  }

  async deleteByIds(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.db
      .delete(shoppingListItems)
      .where(inArray(shoppingListItems.id, [...ids]));
  }
}

/**
 * Postgres sinaliza violação de índice único com `code: '23505'`, mas o Drizzle
 * embrulha o erro do driver e guarda o original em `cause` — por isso a
 * checagem percorre a cadeia em vez de olhar só o topo.
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
