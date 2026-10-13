import type { ItemValidationError } from '../../domain/item-validation';
import type { ShoppingListItem } from '../../domain/shopping-list-item';

/** Item ativo que colide com o nome informado; a borda devolve `id` e `name` no 409. */
export interface DuplicateItemRef {
  id: string;
  name: string;
}

/**
 * Falhas de negócio dos casos de uso: sem status HTTP e sem mensagem PT — a
 * borda (T-06) traduz `validation` → 400, `duplicate-item-name`/`name-conflict`
 * → 409 e `not-found` → 404.
 */
export type ShoppingListError =
  | { readonly code: 'validation'; readonly error: ItemValidationError }
  | {
      readonly code: 'duplicate-item-name';
      readonly duplicateOf: DuplicateItemRef;
    }
  | { readonly code: 'name-conflict'; readonly duplicateOf: DuplicateItemRef }
  | { readonly code: 'not-found' };

/** Resposta de toda operação: lista ativa completa (RN-19) ou falha de negócio. */
export type ShoppingListResult =
  | { readonly ok: true; readonly items: ShoppingListItem[] }
  | { readonly ok: false; readonly error: ShoppingListError };
