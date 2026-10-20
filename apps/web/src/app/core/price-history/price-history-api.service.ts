import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  LowestPriceByMarketResponse,
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from '@lista/contracts';
import { Observable } from 'rxjs';
import { PRICE_HISTORY_API_BASE_URL, priceHistoryUrl } from './price-history-config';

/**
 * As consultas do histórico (ADR 0010/0011 — somente leitura).
 * `Authorization` e o 401 são do interceptor de auth — aqui só as rotas cruas.
 */
@Injectable({ providedIn: 'root' })
export class PriceHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(PRICE_HISTORY_API_BASE_URL);

  listPurchases(): Observable<PurchaseListResponse> {
    return this.http.get<PurchaseListResponse>(this.url('/purchases'));
  }

  getPurchase(id: string): Observable<PurchaseDetailResponse> {
    return this.http.get<PurchaseDetailResponse>(this.url(`/purchases/${id}`));
  }

  /** Sem `query` (ou vazia), o serviço devolve a lista completa. */
  getLowestPrices(query?: string): Observable<LowestPricesResponse> {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<LowestPricesResponse>(this.url('/lowest-prices'), { params });
  }

  /**
   * Menores preços do item por mercado. O `{item}` é o nome normalizado e viaja
   * como segmento cru; `encodeURIComponent` preserva acento e barra
   * (`leite/açúcar` → `leite%2Fa%C3%A7%C3%BAcar`), e quem normaliza é o serviço.
   */
  getLowestPricesByItem(item: string): Observable<LowestPriceByMarketResponse> {
    return this.http.get<LowestPriceByMarketResponse>(
      this.url(`/lowest-prices/${encodeURIComponent(item)}`),
    );
  }

  private url(path = ''): string {
    return priceHistoryUrl(this.baseUrl, path);
  }
}
