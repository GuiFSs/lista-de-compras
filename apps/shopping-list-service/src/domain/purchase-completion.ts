import { randomUUID } from 'node:crypto';
import type {
  PurchaseCompletedItem,
  PurchaseCompletedPayload,
} from '@lista/contracts';
import { validateCheckoutInput } from './checkout-validation';
import type {
  CheckoutInput,
  CheckoutValidationError,
} from './checkout-validation';
import { splitForCheckout } from './shopping-list-item';
import type { ShoppingListItem } from './shopping-list-item';

/**
 * Resultado puro do preparo do checkout:
 * - `no-purchased-items` — 0 comprados: sem mercado/data e sem evento (RN-09);
 * - `invalid` — ≥1 comprado com mercado/data recusados: nada sai da lista;
 * - `ready` — `completionId` + payload prontos para o outbox (I/O fica no caso
 *   de uso, na mesma transação do DELETE dos comprados).
 */
export type PurchaseCompletionPlan =
  | { readonly kind: 'no-purchased-items' }
  | { readonly kind: 'invalid'; readonly error: CheckoutValidationError }
  | {
      readonly kind: 'ready';
      readonly completionId: string;
      readonly payload: PurchaseCompletedPayload;
    };

function toPurchaseCompletedItem(
  item: ShoppingListItem,
): PurchaseCompletedItem | null {
  return item.purchased === null
    ? null
    : {
        name: item.name,
        quantity: item.purchased.quantity,
        unit: item.purchased.unit,
        unitPrice: item.purchased.unitPrice,
      };
}

/**
 * Valida o checkout e monta o payload `PurchaseCompletedPayload` (RN-03/RN-04
 * da spec price-history). `name` segue como digitado (trim) — normalizar para
 * agregação é papel do consumidor, não do produtor.
 */
export function planPurchaseCompletion(
  items: readonly ShoppingListItem[],
  input: CheckoutInput,
  now: Date,
): PurchaseCompletionPlan {
  const { removed } = splitForCheckout(items);
  // RN-09/AC-07: sem comprados não se exige mercado/data e não há evento.
  if (removed.length === 0) {
    return { kind: 'no-purchased-items' };
  }
  const validation = validateCheckoutInput(input, now);
  if (!validation.ok) {
    return { kind: 'invalid', error: validation.error };
  }
  const completionId = randomUUID();
  return {
    kind: 'ready',
    completionId,
    payload: {
      completionId,
      market: validation.market,
      purchaseDate: validation.purchaseDate,
      items: removed
        .map(toPurchaseCompletedItem)
        .filter((item): item is PurchaseCompletedItem => item !== null),
    },
  };
}
