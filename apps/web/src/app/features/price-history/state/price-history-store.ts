import { Injectable, inject, signal } from '@angular/core';
import type {
  LowestPriceItem,
  PurchaseDetailResponse,
  PurchaseListItem,
} from '@lista/contracts';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../shopping-list/data';
import { PriceHistoryApiService } from '../data';

export type PriceHistoryStatus = 'loading' | 'loaded' | 'error';

/** Carga de uma seção: status, dado e erro lidos do mesmo snapshot. */
export interface LoadableState<T> {
  status: PriceHistoryStatus;
  data: T;
  error: string | null;
}

export interface PurchaseDetailState extends LoadableState<PurchaseDetailResponse | null> {
  /** Compra aberta; segue em erro para o retry saber qual id refazer (AC-14). */
  selectedId: string | null;
}

export interface LowestPricesState extends LoadableState<readonly LowestPriceItem[]> {
  /** Última busca enviada ao serviço (`''` = lista completa). */
  query: string;
}

/**
 * Espelho do histórico no PWA. Ordenação, agregação de menor preço e busca são
 * do serviço (RN-06…RN-08): aqui só aplicamos a resposta, sem cálculo de
 * domínio no cliente. Cada `load*` é repetível — repetir refaz o GET (retry do
 * "Tentar novamente", AC-14) e uma resposta atrasada de outra carga é
 * descartada (a última vence). O 401 é do interceptor de auth: logout +
 * volta ao login (AC-18).
 */
@Injectable({ providedIn: 'root' })
export class PriceHistoryStore {
  private readonly api = inject(PriceHistoryApiService);

  private readonly purchasesState = signal<LoadableState<readonly PurchaseListItem[]>>({
    status: 'loading',
    data: [],
    error: null,
  });
  private readonly detailState = signal<PurchaseDetailState>({
    status: 'loading',
    data: null,
    error: null,
    selectedId: null,
  });
  private readonly lowestPricesState = signal<LowestPricesState>({
    status: 'loading',
    data: [],
    error: null,
    query: '',
  });

  // Sequência por seção: busca enquanto digita gera cargas sobrepostas e só
  // a resposta da última pode aplicar estado.
  private purchasesLoadSeq = 0;
  private detailLoadSeq = 0;
  private lowestLoadSeq = 0;

  readonly purchases = this.purchasesState.asReadonly();
  readonly detail = this.detailState.asReadonly();
  readonly lowestPrices = this.lowestPricesState.asReadonly();

  /** Carga inicial da lista; repetir refaz o GET ("Tentar novamente", AC-14). */
  async loadPurchases(): Promise<void> {
    const load = ++this.purchasesLoadSeq;
    this.purchasesState.update((state) => ({ ...state, status: 'loading', error: null }));
    try {
      const response = await firstValueFrom(this.api.listPurchases());
      if (load !== this.purchasesLoadSeq) return;
      this.purchasesState.set({ status: 'loaded', data: response.purchases, error: null });
    } catch (error) {
      if (load !== this.purchasesLoadSeq) return;
      this.purchasesState.update((state) => ({
        ...state,
        status: 'error',
        error: apiErrorMessage(error),
      }));
    }
  }

  /**
   * Abre o detalhe e o torna a seleção. Sem `id`, repete a última seleção
   * (retry do "Tentar novamente", AC-14); sem seleção não há chamada.
   */
  async loadPurchase(id?: string): Promise<void> {
    const targetId = id ?? this.detailState().selectedId;
    if (!targetId) return;

    const load = ++this.detailLoadSeq;
    this.detailState.set({
      status: 'loading',
      data: null,
      error: null,
      selectedId: targetId,
    });
    try {
      const purchase = await firstValueFrom(this.api.getPurchase(targetId));
      if (load !== this.detailLoadSeq) return;
      this.detailState.set({
        status: 'loaded',
        data: purchase,
        error: null,
        selectedId: targetId,
      });
    } catch (error) {
      if (load !== this.detailLoadSeq) return;
      this.detailState.set({
        status: 'error',
        data: null,
        error: apiErrorMessage(error),
        selectedId: targetId,
      });
    }
  }

  /** Sai do detalhe: descarta seleção e invalida resposta pendente. */
  clearPurchase(): void {
    this.detailLoadSeq++;
    this.detailState.set({ status: 'loading', data: null, error: null, selectedId: null });
  }

  /**
   * Carrega os menores preços. Sem `query`, repete a última busca (retry do
   * "Tentar novamente", AC-14); `''` explícita volta à lista completa.
   */
  async loadLowestPrices(query?: string): Promise<void> {
    const term = query ?? this.lowestPricesState().query;
    const load = ++this.lowestLoadSeq;
    this.lowestPricesState.update((state) => ({
      ...state,
      status: 'loading',
      error: null,
      query: term,
    }));
    try {
      const response = await firstValueFrom(this.api.getLowestPrices(term));
      if (load !== this.lowestLoadSeq) return;
      this.lowestPricesState.set({
        status: 'loaded',
        data: response.items,
        error: null,
        query: term,
      });
    } catch (error) {
      if (load !== this.lowestLoadSeq) return;
      this.lowestPricesState.update((state) => ({
        ...state,
        status: 'error',
        error: apiErrorMessage(error),
      }));
    }
  }
}
