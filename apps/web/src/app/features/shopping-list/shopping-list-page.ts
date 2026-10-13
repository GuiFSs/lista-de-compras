import { Component, DestroyRef, computed, inject } from '@angular/core';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { CartIcon } from '../../ui';
import { ItemRow } from './item-row';
import { ShoppingListStore } from './state';

/** Skeleton na forma do conteúdo: linhas, nunca spinner centralizado (AC-02). */
const SKELETON_ROWS: readonly number[] = [0, 1, 2, 3];

/** Sheets desta feature; cada fluxo é ligado à sua tarefa (T-12/T-13/T-14). */
type SheetFlow = 'item-form' | 'purchase' | 'item-actions' | 'checkout';

/**
 * Tela Lista (AC-01/AC-02/AC-03/AC-22/AC-25): app bar com a ação de concluir,
 * apoio da lista, coluna única na ordem do serviço e os 4 estados. O estado
 * vive no store (RN-19) — a tela só apresenta.
 */
@Component({
  selector: 'app-shopping-list-page',
  imports: [ItemRow],
  templateUrl: './shopping-list-page.html',
  styleUrl: './shopping-list-page.scss',
})
export class ShoppingListPage {
  private readonly store = inject(ShoppingListStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = this.store.status;
  protected readonly items = this.store.items;
  protected readonly loadError = this.store.loadError;
  protected readonly skeletonRows = SKELETON_ROWS;

  /** Apoio do topo (guia §4): "N pendentes · M comprados", só com itens. */
  protected readonly summary = computed(() => {
    const pending = this.store.pendingCount();
    const purchased = this.store.purchasedCount();
    return `${pending} ${pending === 1 ? 'pendente' : 'pendentes'} · ${purchased} ${
      purchased === 1 ? 'comprado' : 'comprados'
    }`;
  });

  constructor() {
    // Título e ação da app bar são da rota ativa (T-09); o "Sair" é do shell.
    this.chrome.contribute(
      {
        title: DEFAULT_SHELL_TITLE,
        actions: [
          {
            label: 'Concluir compra',
            icon: CartIcon,
            run: () => this.requestSheet('checkout'),
          },
        ],
      },
      this.destroyRef,
    );

    // A lista vive no serviço: toda entrada na tela refaz o GET (AC-02/AC-24).
    void this.store.load();
  }

  /** "Tentar novamente" do erro de carga (AC-22). */
  protected retry(): void {
    void this.store.load();
  }

  protected onAddItem(): void {
    this.requestSheet('item-form');
  }

  protected onTogglePurchased(): void {
    // Pendente abre o sheet de compra; comprado desmarca (T-13).
    this.requestSheet('purchase');
  }

  protected onOpenActions(): void {
    this.requestSheet('item-actions');
  }

  /**
   * Seam dos sheets: T-12 (item), T-13 (compra) e T-14 (ações e conclusão).
   * Estrutura, 4 estados e alvos valem desde já; nenhum fluxo altera a lista
   * por conta própria — mudança de estado continua sendo só do store.
   */
  private requestSheet(flow: SheetFlow): void {
    void flow;
  }
}
