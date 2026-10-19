import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from '@lista/contracts';
import { Observable } from 'rxjs';
import { PRICE_HISTORY_API_BASE_URL, priceHistoryUrl } from './price-history-config';

/**
 * As 3 consultas do histórico (ADR 0010 — somente leitura nesta rodada).
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

  private url(path = ''): string {
    return priceHistoryUrl(this.baseUrl, path);
  }
}
