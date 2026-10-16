import type { CheckoutValidationError } from '../../domain/checkout-validation';
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
 * → 409 e `not-found` → 404. `checkout-validation` é do checkout com ≥1
 * comprado: a borda mapeia os códigos de mercado/data no mesmo 400 (RN-03/RN-04).
 */
export type ShoppingListError =
  | { readonly code: 'validation'; readonly error: ItemValidationError }
  | {
      readonly code: 'duplicate-item-name';
      readonly duplicateOf: DuplicateItemRef;
    }
  | { readonly code: 'name-conflict'; readonly duplicateOf: DuplicateItemRef }
  | { readonly code: 'checkout-validation'; readonly error: CheckoutValidationError }
  | { readonly code: 'not-found' };

/** Resposta de toda operação: lista ativa completa (RN-19) ou falha de negócio. */
export type ShoppingListResult =
  | {
      readonly ok: true;
      readonly items: ShoppingListItem[];
      /**
       * Só a criação define: `true` quando inseriu um item novo, `false` quando
       * aplicou a soma a um item existente — a borda decide 201 × 200 (CD-02).
       * Ausente nas demais operações.
       */
      readonly created?: boolean;
    }
  | { readonly ok: false; readonly error: ShoppingListError };
