import { ItemUnit } from '../http/shopping-list';

export const PURCHASE_COMPLETED_EVENT_TYPE =
  'shopping-list.purchase-completed' as const;

export const PURCHASE_COMPLETED_EVENT_VERSION = 1 as const;

/** Routing key no exchange `domain.events` (topic). */
export const PURCHASE_COMPLETED_ROUTING_KEY =
  'shopping-list.purchase-completed.v1' as const;

export interface PurchaseCompletedItem {
  name: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

export interface PurchaseCompletedPayload {
  /** Chave de idempotência no consumidor. */
  completionId: string;
  market: string;
  /** YYYY-MM-DD */
  purchaseDate: string;
  items: PurchaseCompletedItem[];
}

/** Envelope v1 publicado pelo shopping-list-service após checkout com ≥1 comprado. */
export interface PurchaseCompletedEventV1 {
  /** UUID da mensagem (rastreio). */
  eventId: string;
  eventType: typeof PURCHASE_COMPLETED_EVENT_TYPE;
  eventVersion: typeof PURCHASE_COMPLETED_EVENT_VERSION;
  /** ISO-8601 — momento do checkout. */
  occurredAt: string;
  payload: PurchaseCompletedPayload;
}
