import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CheckoutShoppingListRequest,
  CreateShoppingListItemRequest,
  MarkItemPurchasedRequest,
  ShoppingListResponse,
  UpdateShoppingListItemRequest,
} from '@lista/contracts';
import { Observable } from 'rxjs';
import { SHOPPING_LIST_API_BASE_URL, shoppingListUrl } from '../../../core/shopping-list';

/**
 * As 8 operações do contrato da lista ativa (PLAN, seção "Contratos"). O
 * `Authorization` e o 401 são do interceptor de auth — aqui só a rota crua.
 * Toda resposta de mutação é a lista ativa completa (RN-19/AC-24).
 */
@Injectable({ providedIn: 'root' })
export class ShoppingListApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(SHOPPING_LIST_API_BASE_URL);

  getActiveList(): Observable<ShoppingListResponse> {
    return this.http.get<ShoppingListResponse>(this.url());
  }

  createItem(request: CreateShoppingListItemRequest): Observable<ShoppingListResponse> {
    return this.http.post<ShoppingListResponse>(this.url('/items'), request);
  }

  updateItem(id: string, request: UpdateShoppingListItemRequest): Observable<ShoppingListResponse> {
    return this.http.patch<ShoppingListResponse>(this.url(`/items/${id}`), request);
  }

  removeItem(id: string): Observable<ShoppingListResponse> {
    return this.http.delete<ShoppingListResponse>(this.url(`/items/${id}`));
  }

  restoreItem(id: string): Observable<ShoppingListResponse> {
    return this.http.post<ShoppingListResponse>(this.url(`/items/${id}/restore`), null);
  }

  markItemPurchased(
    id: string,
    request: MarkItemPurchasedRequest,
  ): Observable<ShoppingListResponse> {
    return this.http.put<ShoppingListResponse>(this.url(`/items/${id}/purchase`), request);
  }

  unmarkItemPurchased(id: string): Observable<ShoppingListResponse> {
    return this.http.delete<ShoppingListResponse>(this.url(`/items/${id}/purchase`));
  }

  /**
   * Conclui a compra. Com ≥1 comprado o corpo leva `market`/`purchaseDate`
   * (RN-03/RN-04); sem comprados o corpo pode ser omitido (RN-09) — `null`.
   */
  checkout(
    request: CheckoutShoppingListRequest | null = null,
  ): Observable<ShoppingListResponse> {
    return this.http.post<ShoppingListResponse>(this.url('/checkout'), request);
  }

  private url(path = ''): string {
    return shoppingListUrl(this.baseUrl, path);
  }
}
