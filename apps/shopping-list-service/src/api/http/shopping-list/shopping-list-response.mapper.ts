import type {
  ShoppingListItem as ShoppingListItemResponse,
  ShoppingListResponse,
} from '@lista/contracts';
import type { ShoppingListItem } from '../../../domain/shopping-list-item';

/** Converte o item de domínio no DTO do contrato (datas → ISO-8601). */
export function toShoppingListResponse(
  items: readonly ShoppingListItem[],
): ShoppingListResponse {
  return { items: items.map(toItemResponse) };
}

function toItemResponse(item: ShoppingListItem): ShoppingListItemResponse {
  return {
    id: item.id,
    name: item.name,
    plannedQuantity: item.plannedQuantity,
    unit: item.unit,
    plannedPrice: item.plannedPrice,
    purchased:
      item.purchased === null
        ? null
        : {
            quantity: item.purchased.quantity,
            unit: item.purchased.unit,
            unitPrice: item.purchased.unitPrice,
            purchasedAt: item.purchased.purchasedAt.toISOString(),
          },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
