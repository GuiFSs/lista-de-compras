import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import type { ShoppingListItem } from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { CartIcon, ToastService } from '../../ui';
import { ItemFormSheet, type ItemFormMode } from './item-form-sheet';
import { ItemRow } from './item-row';
import { PurchaseSheet, type PurchaseDraft } from './purchase-sheet';
import { ShoppingListStore } from './state';

/** Skeleton na forma do conteúdo: linhas, nunca spinner centralizado (AC-02). */
const SKELETON_ROWS: readonly number[] = [0, 1, 2, 3];

/** Fluxos ainda ligados ao sheet de ações/conclusão (T-14). */
type SheetFlow = 'item-actions' | 'checkout';

/**
 * Tela Lista (AC-01/AC-02/AC-03/AC-22/AC-25): app bar com a ação de concluir,
 * apoio da lista, coluna única na ordem do serviço e os 4 estados. O estado
 * vive no store (RN-19) — a tela só apresenta.
 */
@Component({
  selector: 'app-shopping-list-page',
  imports: [ItemRow, ItemFormSheet, PurchaseSheet],
  templateUrl: './shopping-list-page.html',
  styleUrl: './shopping-list-page.scss',
})
export class ShoppingListPage {
  private readonly store = inject(ShoppingListStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = this.store.status;
  protected readonly items = this.store.items;
  protected readonly loadError = this.store.loadError;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly formOpen = signal(false);
  protected readonly formMode = signal<ItemFormMode>('create');
  protected readonly formItem = signal<ShoppingListItem | null>(null);

  /** Item com o sheet de compra aberto; `null` = fechado (T-13). */
  protected readonly purchaseItem = signal<ShoppingListItem | null>(null);

  /**
   * Valores digitados por item, preservados após desmarcar (RN-12/CD-04): o
   * serviço limpa os dados da compra ao desmarcar, então a tela guarda o que a
   * pessoa digitou para reaproveitar se ela marcar de novo — só nesta sessão.
   */
  private readonly purchaseDrafts = signal<ReadonlyMap<string, PurchaseDraft>>(new Map());

  /** Desmarcações em andamento — evita toasts repetidos em toques duplos (AC-26). */
  private readonly unmarking = new Set<string>();

  protected readonly purchaseDraft = computed<PurchaseDraft | null>(() => {
    const item = this.purchaseItem();
    return item === null ? null : (this.purchaseDrafts().get(item.id) ?? null);
  });

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

    // Toda falha de mutação vira um toast que só sai por descarte (AC-23): a
    // mensagem vive no store (RN-17) e o host de toasts é montado em T-14.
    effect(() => {
      const message = this.store.mutationError();
      if (message === null) return;
      this.toasts.error(message);
      this.store.clearMutationError();
    });

    // A lista vive no serviço: toda entrada na tela refaz o GET (AC-02/AC-24).
    void this.store.load();
  }

  /** "Tentar novamente" do erro de carga (AC-22). */
  protected retry(): void {
    void this.store.load();
  }

  protected onAddItem(): void {
    this.openForm('create', null);
  }

  protected onTogglePurchased(item: ShoppingListItem): void {
    // Pendente abre o sheet de compra com o prefill; comprado desmarca na hora.
    if (item.purchased !== null) {
      void this.unmark(item);
      return;
    }
    this.purchaseItem.set(item);
  }

  protected onPurchaseClosed(): void {
    this.purchaseItem.set(null);
  }

  protected onPurchased(): void {
    this.purchaseItem.set(null);
    this.toasts.show('Item marcado como comprado');
  }

  protected onOpenActions(item: ShoppingListItem): void {
    // O sheet de ações (Marcar/Editar/Excluir) é T-14; até lá a linha abre o
    // formulário de edição, que já é o destino da ação "Editar" — inclusive
    // para item comprado (AC-17).
    this.openForm('edit', item);
  }

  protected onFormClosed(): void {
    this.closeForm();
  }

  protected onFormSaved(): void {
    const message = this.formMode() === 'create' ? 'Item adicionado' : 'Item atualizado';
    this.closeForm();
    this.toasts.show(message);
  }

  private openForm(mode: ItemFormMode, item: ShoppingListItem | null): void {
    this.formMode.set(mode);
    this.formItem.set(item);
    this.formOpen.set(true);
  }

  private closeForm(): void {
    this.formOpen.set(false);
    this.formItem.set(null);
  }

  /**
   * Desmarca um item comprado (AC-16). Os dados da compra somem do serviço, mas
   * ficam na tela para remarcar sem redigitar (RN-12/CD-04) — o toque duplo
   * compartilha uma única requisição (AC-26).
   */
  private async unmark(item: ShoppingListItem): Promise<void> {
    const purchased = item.purchased;
    if (purchased === null || this.unmarking.has(item.id)) return;

    this.unmarking.add(item.id);
    try {
      const outcome = await this.store.unmarkItemPurchased(item.id);
      if (outcome.kind !== 'ok') return;
      this.purchaseDrafts.update((drafts) =>
        new Map(drafts).set(item.id, {
          purchasedQuantity: purchased.quantity,
          unit: purchased.unit,
          unitPrice: purchased.unitPrice,
        }),
      );
      this.toasts.show('Item desmarcado');
    } finally {
      this.unmarking.delete(item.id);
    }
  }

  /**
   * Seam dos sheets restantes: T-14 liga as ações do item e a conclusão. Nenhum
   * fluxo altera a lista por conta própria — mudança de estado é só do store.
   */
  private requestSheet(flow: SheetFlow): void {
    void flow;
  }
}
