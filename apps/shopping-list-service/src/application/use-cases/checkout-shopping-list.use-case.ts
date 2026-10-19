import { randomUUID } from 'node:crypto';
import {
  PURCHASE_COMPLETED_EVENT_TYPE,
  PURCHASE_COMPLETED_EVENT_VERSION,
} from '@lista/contracts';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import type { CheckoutInput } from '../../domain/checkout-validation';
import { planPurchaseCompletion } from '../../domain/purchase-completion';
import {
  sortItemsForList,
  splitForCheckout,
} from '../../domain/shopping-list-item';
import type { OutboxRepository } from '../ports/outbox-repository.port';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import type { ShoppingListResult } from './shopping-list-result';

/** Mercado/data aceitos (já trimados pelo domínio) mais a montagem do envelope. */
function toEnvelope(
  payload: PurchaseCompletedEventV1['payload'],
  occurredAt: Date,
): PurchaseCompletedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: PURCHASE_COMPLETED_EVENT_TYPE,
    eventVersion: PURCHASE_COMPLETED_EVENT_VERSION,
    occurredAt: occurredAt.toISOString(),
    payload,
  };
}

/**
 * Concluir a compra (`POST /api/shopping-list/checkout`). Com ≥1 comprado exige
 * mercado/data (RN-03/RN-04) e delega a gravação — `DELETE` dos comprados +
 * `INSERT` no outbox na **mesma** transação do port (CD-06); sem comprados nada
 * é gravado e a lista sai intacta (RN-09). O broker não entra aqui: a
 * publicação assíncrona com retry é do publisher, então broker fora não falha
 * o HTTP.
 */
export class CheckoutShoppingListUseCase {
  constructor(
    private readonly repository: ShoppingListRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(input: CheckoutInput): Promise<ShoppingListResult> {
    const now = new Date();
    const items = await this.repository.findActive();
    const plan = planPurchaseCompletion(items, input, now);
    if (plan.kind === 'invalid') {
      return {
        ok: false,
        error: { code: 'checkout-validation', error: plan.error },
      };
    }

    const { remaining, removed } = splitForCheckout(items);
    if (plan.kind === 'ready') {
      await this.outbox.deletePurchasedAndEnqueue(
        removed.map((item) => item.id),
        toEnvelope(plan.payload, now),
      );
    }
    return { ok: true, items: sortItemsForList(remaining) };
  }
}
