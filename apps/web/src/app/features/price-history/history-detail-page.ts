import { Component, DestroyRef, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShellChromeService } from '../../layout/shell-chrome';
import {
  formatPurchaseDate,
  formatQuantity,
  formatUnitPrice,
} from './purchase-format';
import { PriceHistoryStore } from './state';

/** Skeleton na forma do detalhe (AC-13): título + linhas de itens. */
const SKELETON_ITEMS: readonly number[] = [0, 1, 2];

/**
 * Detalhe da compra (AC-11/AC-13/AC-14): data, mercado e os itens comprados
 * daquela conclusão. O `id` vem da rota e a compra é buscada no serviço; ao
 * sair, a seleção é descartada para não vazar estado entre visitas (RN-19).
 */
@Component({
  selector: 'app-history-detail-page',
  imports: [RouterLink],
  templateUrl: './history-detail-page.html',
  styleUrl: './history-detail-page.scss',
})
export class HistoryDetailPage {
  private readonly store = inject(PriceHistoryStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly status = computed(() => this.store.detail().status);
  protected readonly purchase = computed(() => this.store.detail().data);
  protected readonly loadError = computed(() => this.store.detail().error);

  protected readonly skeletonItems = SKELETON_ITEMS;
  protected readonly formatDate = formatPurchaseDate;
  protected readonly formatQuantity = formatQuantity;
  protected readonly formatUnitPrice = formatUnitPrice;

  constructor() {
    this.chrome.contribute({ title: 'Compra', actions: [] }, this.destroyRef);

    // A seleção sai com a rota: detalhe de uma compra não sobrevive à tela.
    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) void this.store.loadPurchase(id);
    this.destroyRef.onDestroy(() => this.store.clearPurchase());
  }

  /** "Tentar novamente" (AC-14): sem id, o store repete a última seleção. */
  protected retry(): void {
    void this.store.loadPurchase();
  }
}
