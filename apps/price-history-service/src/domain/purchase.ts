import type {
  ItemUnit,
  PurchaseCompletedItem,
  PurchaseCompletedPayload,
} from '@lista/contracts';
import { normalizeItemName } from './item-name';

/** Item comprado do histórico (RN-05), já com a chave de agrupamento/busca (RN-06). */
export interface PriceHistoryPurchaseItem {
  /** Como digitado (apenas trim); exibido quando este item ostenta o menor preço. */
  name: string;
  nameNormalized: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

/** Compra concluída no histórico (RN-05). */
export interface PriceHistoryPurchase {
  /** = `completionId` do evento — identifica a compra (RN-11). */
  id: string;
  market: string;
  /** YYYY-MM-DD (RN-04). */
  purchaseDate: string;
  /** ISO-8601 do consumo do evento. */
  createdAt: string;
  items: PriceHistoryPurchaseItem[];
}

export interface NewPurchaseInput {
  /** Payload já aceito por `validatePurchaseCompletedPayload`. */
  payload: PurchaseCompletedPayload;
  createdAt: string;
}

function toPurchaseItem(item: PurchaseCompletedItem): PriceHistoryPurchaseItem {
  return {
    name: item.name.trim(),
    nameNormalized: normalizeItemName(item.name),
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
  };
}

/**
 * Monta a compra do histórico a partir do evento validado. O produtor manda o
 * nome como digitado (`purchase-completion.ts` do shopping-list); derivar a
 * chave normalizada é papel do consumidor (RN-06).
 */
export function createPriceHistoryPurchase(
  input: NewPurchaseInput,
): PriceHistoryPurchase {
  return {
    id: input.payload.completionId,
    market: input.payload.market.trim(),
    purchaseDate: input.payload.purchaseDate,
    createdAt: input.createdAt,
    items: input.payload.items.map(toPurchaseItem),
  };
}
