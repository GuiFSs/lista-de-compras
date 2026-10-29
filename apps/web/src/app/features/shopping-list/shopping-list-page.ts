import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { RecognizeReceiptResponse, ShoppingListItem } from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { CartIcon, ReceiptIcon, ToastHost, ToastService } from '../../ui';
import { CheckoutSheet } from './checkout-sheet';
import { ItemActionsSheet } from './item-actions-sheet';
import { ItemFormSheet, type ItemFormMode } from './item-form-sheet';
import { ItemRow } from './item-row';
import { PurchaseSheet, type PurchaseDraft } from './purchase-sheet';
import { ReceiptReviewSheet } from './receipt-review-sheet';
import {
  ReceiptSourceSheet,
  type ReceiptImageSource,
} from './receipt-source-sheet';
import { ShoppingListStore } from './state';

/** Skeleton na forma do conteúdo: linhas, nunca spinner centralizado (AC-02). */
const SKELETON_ROWS: readonly number[] = [0, 1, 2, 3];

/** Sheets que abrem por cima da lista: ações do item (T-14) e conclusão (T-14). */
type SheetFlow = 'item-actions' | 'checkout';

/**
 * Tela Lista (AC-01/AC-02/AC-03/AC-22/AC-25): app bar com a ação de concluir,
 * apoio da lista, coluna única na ordem do serviço e os 4 estados. O estado
 * vive no store (RN-19) — a tela só apresenta.
 */
@Component({
  selector: 'app-shopping-list-page',
  imports: [
    ItemRow,
    ItemFormSheet,
    PurchaseSheet,
    ItemActionsSheet,
    CheckoutSheet,
    ReceiptReviewSheet,
    ReceiptSourceSheet,
    ToastHost,
  ],
  templateUrl: './shopping-list-page.html',
  styleUrl: './shopping-list-page.scss',
})
export class ShoppingListPage {
  private readonly store = inject(ShoppingListStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly receiptCameraInput =
    viewChild<ElementRef<HTMLInputElement>>('receiptCameraInput');
  private readonly receiptGalleryInput =
    viewChild<ElementRef<HTMLInputElement>>('receiptGalleryInput');

  protected readonly status = this.store.status;
  protected readonly items = this.store.items;
  protected readonly loadError = this.store.loadError;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly formOpen = signal(false);
  protected readonly formMode = signal<ItemFormMode>('create');
  protected readonly formItem = signal<ShoppingListItem | null>(null);

  /** Item com o sheet de compra aberto; `null` = fechado (T-13). */
  protected readonly purchaseItem = signal<ShoppingListItem | null>(null);

  /** Item com o sheet de ações aberto; `null` = fechado (T-14). */
  protected readonly actionsItem = signal<ShoppingListItem | null>(null);

  /** Sheet de conclusão da compra aberto (T-14). */
  protected readonly checkoutOpen = signal(false);

  protected readonly receiptSourceOpen = signal(false);
  protected readonly recognizing = signal(false);
  protected readonly receiptDraft = signal<RecognizeReceiptResponse | null>(null);
  protected readonly checkoutMarket = signal<string | null>(null);
  protected readonly checkoutPurchaseDate = signal<string | null>(null);

  /**
   * Valores digitados por item, preservados após desmarcar (RN-12/CD-04): o
   * serviço limpa os dados da compra ao desmarcar, então a tela guarda o que a
   * pessoa digitou para reaproveitar se ela marcar de novo — só nesta sessão.
   */
  private readonly purchaseDrafts = signal<ReadonlyMap<string, PurchaseDraft>>(new Map());

  /** Desmarcações em andamento — evita toasts repetidos em toques duplos (AC-26). */
  private readonly unmarking = new Set<string>();

  /** Exclusões em andamento — o toque duplo compartilha uma só "Desfazer". */
  private readonly removing = new Set<string>();

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
            label: 'Importar nota',
            icon: ReceiptIcon,
            run: () => this.onImportReceipt(),
          },
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

  protected onImportReceipt(): void {
    if (this.recognizing()) return;
    this.receiptSourceOpen.set(true);
  }

  protected onReceiptSourceClosed(): void {
    this.receiptSourceOpen.set(false);
  }

  protected onReceiptSourceChosen(source: ReceiptImageSource): void {
    this.receiptSourceOpen.set(false);
    // Deixa o sheet fechar antes de abrir o seletor nativo (câmera/galeria).
    setTimeout(() => {
      const input =
        source === 'camera'
          ? this.receiptCameraInput()?.nativeElement
          : this.receiptGalleryInput()?.nativeElement;
      input?.click();
    }, 0);
  }

  protected async onReceiptFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (file === null || this.recognizing()) return;

    this.recognizing.set(true);
    try {
      const outcome = await this.store.recognizeReceipt(file);
      if (outcome.kind !== 'ok') return;
      this.receiptDraft.set(outcome.receipt);
    } finally {
      this.recognizing.set(false);
    }
  }

  protected onReceiptReviewClosed(): void {
    this.receiptDraft.set(null);
  }

  protected onReceiptApplied(meta: {
    market: string | null;
    purchaseDate: string | null;
  }): void {
    this.receiptDraft.set(null);
    this.checkoutMarket.set(meta.market);
    this.checkoutPurchaseDate.set(meta.purchaseDate);
    this.checkoutOpen.set(true);
    this.toasts.show('Itens importados da nota');
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
    // As ações secundárias saem da linha (guia §5) e ficam neste sheet; elas não
    // mudam estado — cada uma escolhe o próximo fluxo.
    this.requestSheet('item-actions', item);
  }

  protected onActionsClosed(): void {
    this.actionsItem.set(null);
  }

  /** Marcar reusa o sheet de compra (T-13); comprado, a ação desmarca (AC-17). */
  protected onActionsToggle(): void {
    const item = this.consumeActionsItem();
    if (item !== null) this.onTogglePurchased(item);
  }

  protected onActionsEdit(): void {
    const item = this.consumeActionsItem();
    if (item !== null) this.openForm('edit', item);
  }

  protected onActionsDelete(): void {
    const item = this.consumeActionsItem();
    if (item !== null) void this.remove(item);
  }

  protected onCheckoutClosed(): void {
    // Cancelar o resumo não muda nada: nada é enviado ao serviço (AC-19).
    this.checkoutOpen.set(false);
    this.checkoutMarket.set(null);
    this.checkoutPurchaseDate.set(null);
  }

  protected onCheckoutConfirmed(): void {
    this.checkoutOpen.set(false);
    this.checkoutMarket.set(null);
    this.checkoutPurchaseDate.set(null);
    this.toasts.show('Compra concluída');
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
   * Excluir (AC-11/CD-07): a linha sai na hora e o toast oferece "Desfazer"
   * dentro da janela de ≈4s do store. Se a chamada falhar, nada é inventado na
   * tela: o erro fica no toast persistente e o store relê o serviço quando a
   * exclusão pode ter sido aplicada sem resposta (AC-23).
   */
  private async remove(item: ShoppingListItem): Promise<void> {
    if (this.removing.has(item.id)) return;

    this.removing.add(item.id);
    try {
      const outcome = await this.store.removeItem(item.id);
      if (outcome.kind !== 'ok') return;
      this.toasts.show('Item excluído', {
        label: 'Desfazer',
        // Restaurar é do serviço (RN-08): devolve o item com os mesmos dados.
        run: () => void this.store.undoRemove(),
      });
    } finally {
      this.removing.delete(item.id);
    }
  }

  /** Fecha o sheet de ações devolvendo o item — uma ação por abertura. */
  private consumeActionsItem(): ShoppingListItem | null {
    const item = this.actionsItem();
    this.actionsItem.set(null);
    return item;
  }

  /**
   * Entrada única dos sheets da tela: a ação da app bar abre a conclusão e a
   * linha abre as ações do item. Nenhum fluxo altera a lista por conta própria —
   * mudança de estado é só do store.
   */
  private requestSheet(flow: SheetFlow, item: ShoppingListItem | null = null): void {
    if (flow === 'checkout') {
      this.checkoutOpen.set(true);
      return;
    }
    if (item !== null) this.actionsItem.set(item);
  }
}
