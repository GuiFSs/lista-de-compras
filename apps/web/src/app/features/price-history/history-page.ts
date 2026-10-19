import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellChromeService } from '../../layout/shell-chrome';
import { formatPurchaseDate } from './purchase-format';
import { PriceHistoryStore } from './state';

/** Skeleton na forma das linhas do histórico (AC-13), nunca spinner sozinho. */
const SKELETON_ROWS: readonly number[] = [0, 1, 2];

/**
 * Tela Histórico (AC-06/AC-12/AC-13/AC-14): lista as compras concluídas, da
 * mais recente para a mais antiga, e abre o detalhe. Ordem, data e mercado vêm
 * do serviço (RN-08) — a tela não reordena nem calcula domínio.
 */
@Component({
  selector: 'app-history-page',
  imports: [RouterLink],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage {
  private readonly store = inject(PriceHistoryStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);

  // O estado da lista vive no store (RN-19); a tela só apresenta.
  protected readonly status = computed(() => this.store.purchases().status);
  protected readonly purchases = computed(() => this.store.purchases().data);
  protected readonly loadError = computed(() => this.store.purchases().error);

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly formatDate = formatPurchaseDate;

  /** Apoio do topo (guia §4): quantidade de compras, só quando há itens. */
  protected readonly summary = computed(() => {
    const count = this.purchases().length;
    return count === 1 ? '1 compra' : `${count} compras`;
  });

  constructor() {
    this.chrome.contribute({ title: 'Histórico', actions: [] }, this.destroyRef);

    // Toda entrada na tela refaz o GET: o histórico é do serviço (RN-01/AC-14).
    void this.store.loadPurchases();
  }

  protected itemsLabel(count: number): string {
    return count === 1 ? '1 item' : `${count} itens`;
  }

  /** "Tentar novamente" do erro de carga (AC-14). */
  protected retry(): void {
    void this.store.loadPurchases();
  }
}
