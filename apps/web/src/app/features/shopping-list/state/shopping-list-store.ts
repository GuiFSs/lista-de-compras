import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import type {
  CheckoutShoppingListRequest,
  CreateShoppingListItemRequest,
  MarkItemPurchasedRequest,
  ShoppingListItem,
  ShoppingListResponse,
  UpdateShoppingListItemRequest,
} from '@lista/contracts';
import { firstValueFrom } from 'rxjs';
import {
  ShoppingListApiService,
  apiErrorMessage,
  duplicateOfFromError,
  isNetworkError,
  type DuplicateOf,
} from '../data';

/**
 * Espelho da lista ativa. O serviço é dono dos dados e da ordem (RN-18/RN-19),
 * então cada mutação aplica a lista completa devolvida — o cliente nunca
 * recombina estado. Nada é persistido no navegador: recarregar é um novo GET.
 */

/** Janela do "Desfazer" do excluir (RN-08/guia §5: ≈4s, igual ao toast). */
export const UNDO_WINDOW_MS = 4000;

export type ShoppingListStatus = 'loading' | 'loaded' | 'error';

/** Item excluído que ainda pode voltar pelo toast "Desfazer". */
export interface PendingUndo {
  id: string;
  name: string;
}

export type MutationErrorOutcome = { kind: 'error'; message: string };

export type MutationOutcome = { kind: 'ok' } | MutationErrorOutcome;

export type CreateItemOutcome =
  | { kind: 'created' }
  | { kind: 'duplicate'; duplicateOf: DuplicateOf }
  | MutationErrorOutcome;

export type UpdateItemOutcome =
  | { kind: 'updated' }
  | { kind: 'conflict'; duplicateOf: DuplicateOf }
  | MutationErrorOutcome;

@Injectable({ providedIn: 'root' })
export class ShoppingListStore {
  private readonly api = inject(ShoppingListApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly statusState = signal<ShoppingListStatus>('loading');
  private readonly itemsState = signal<readonly ShoppingListItem[]>([]);
  private readonly loadErrorState = signal<string | null>(null);
  private readonly mutationErrorState = signal<string | null>(null);
  private readonly pendingUndoState = signal<PendingUndo | null>(null);
  private readonly concludingState = signal(false);
  private readonly busyState = signal(0);

  /** Requisições em andamento por operação — single-flight (AC-26). */
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly status = this.statusState.asReadonly();
  readonly items = this.itemsState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();
  readonly mutationError = this.mutationErrorState.asReadonly();
  readonly pendingUndo = this.pendingUndoState.asReadonly();

  /** Conclusão da compra em andamento: o CTA do sheet mostra progresso (AC-20). */
  readonly concluding = this.concludingState.asReadonly();

  readonly saving = computed(() => this.busyState() > 0);
  readonly pendingCount = computed(
    () => this.itemsState().filter((item) => item.purchased === null).length,
  );
  readonly purchasedCount = computed(
    () => this.itemsState().filter((item) => item.purchased !== null).length,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.closeUndoWindow());
  }

  /** Carga inicial e "Tentar novamente" do erro de carga (AC-02/AC-22). */
  load(): Promise<void> {
    return this.singleFlight('load', async () => {
      this.statusState.set('loading');
      this.loadErrorState.set(null);
      try {
        this.applyList(await firstValueFrom(this.api.getActiveList()));
      } catch (error) {
        this.loadErrorState.set(apiErrorMessage(error));
        this.statusState.set('error');
      }
    });
  }

  createItem(request: CreateShoppingListItemRequest): Promise<CreateItemOutcome> {
    return this.runMutation('create', async () => {
      try {
        this.applyList(await firstValueFrom(this.api.createItem(request)));
        return { kind: 'created' } as CreateItemOutcome;
      } catch (error) {
        // 409 na criação é fluxo (AC-07): a tela pergunta "somar?" e reenvia com
        // `duplicateResolution`. Não é erro visível, então nada de toast/sinal.
        const duplicateOf = duplicateOfFromError(error);
        if (duplicateOf) return { kind: 'duplicate', duplicateOf };
        return this.failed(error);
      }
    });
  }

  updateItem(id: string, request: UpdateShoppingListItemRequest): Promise<UpdateItemOutcome> {
    return this.runMutation(`update:${id}`, async () => {
      try {
        this.applyList(await firstValueFrom(this.api.updateItem(id, request)));
        return { kind: 'updated' } as UpdateItemOutcome;
      } catch (error) {
        // 409 na edição é conflito terminal, sem soma (CD-13): a tela mostra no
        // formulário; o item permanece como está no serviço.
        const duplicateOf = duplicateOfFromError(error);
        if (duplicateOf) return { kind: 'conflict', duplicateOf };
        return this.failed(error);
      }
    });
  }

  /** Exclui imediatamente e abre a janela de "Desfazer" (AC-11/RN-08). */
  removeItem(id: string): Promise<MutationOutcome> {
    return this.runMutation(`delete:${id}`, async () => {
      const removed = this.itemsState().find((item) => item.id === id);
      try {
        this.applyList(await firstValueFrom(this.api.removeItem(id)));
        this.openUndoWindow({ id, name: removed?.name ?? '' });
        return { kind: 'ok' } as MutationOutcome;
      } catch (error) {
        return this.failed(error);
      }
    });
  }

  /**
   * "Desfazer" do toast de exclusão. Cancela a janela pendente e restaura pelo
   * serviço; se a janela já expirou (ou nunca existiu), não há requisição.
   */
  undoRemove(): Promise<MutationOutcome> {
    const pending = this.pendingUndoState();
    if (!pending) return Promise.resolve<MutationOutcome>({ kind: 'ok' });

    this.closeUndoWindow();
    return this.runMutation(`restore:${pending.id}`, async () => {
      try {
        this.applyList(await firstValueFrom(this.api.restoreItem(pending.id)));
        return { kind: 'ok' } as MutationOutcome;
      } catch (error) {
        // 409 (nome retomado por outro item) ou rede: a lista do cliente pode
        // divergir do serviço, então a releitura é obrigatória aqui (AC-23).
        return this.failed(error, true);
      }
    });
  }

  markItemPurchased(id: string, request: MarkItemPurchasedRequest): Promise<MutationOutcome> {
    return this.runMutation(`purchase:${id}`, async () => {
      try {
        this.applyList(await firstValueFrom(this.api.markItemPurchased(id, request)));
        return { kind: 'ok' } as MutationOutcome;
      } catch (error) {
        return this.failed(error);
      }
    });
  }

  unmarkItemPurchased(id: string): Promise<MutationOutcome> {
    return this.runMutation(`unpurchase:${id}`, async () => {
      try {
        this.applyList(await firstValueFrom(this.api.unmarkItemPurchased(id)));
        return { kind: 'ok' } as MutationOutcome;
      } catch (error) {
        return this.failed(error);
      }
    });
  }

  /**
   * Conclui a compra: só os comprados saem; com 0 comprados o corpo é omitido e
   * a lista sai intacta (RN-09). A resposta do POST já é a lista sem os
   * comprados (RN-19) — aplicar é recarregar, sem um GET extra.
   */
  checkout(request: CheckoutShoppingListRequest | null = null): Promise<MutationOutcome> {
    return this.runMutation('checkout', async () => {
      this.concludingState.set(true);
      try {
        this.applyList(await firstValueFrom(this.api.checkout(request)));
        return { kind: 'ok' } as MutationOutcome;
      } catch (error) {
        // O digitado é do formulário, não do store: aqui a falha só vira
        // mensagem (e releitura quando a rede pode ter aplicado — AC-23).
        return this.failed(error);
      } finally {
        this.concludingState.set(false);
      }
    });
  }

  /** Descarta a mensagem de erro de mutação (o toast só sai por descarte — AC-23). */
  clearMutationError(): void {
    this.mutationErrorState.set(null);
  }

  private applyList(response: ShoppingListResponse): void {
    this.itemsState.set(response.items);
    this.loadErrorState.set(null);
    this.statusState.set('loaded');
  }

  /**
   * Falha de mutação: mensagem visível e, quando o serviço pode ter aplicado a
   * chamada sem devolver a resposta (rede), releitura para não deixar estado
   * fantasma no cliente (AC-23).
   */
  private async failed(
    error: unknown,
    refresh = isNetworkError(error),
  ): Promise<MutationErrorOutcome> {
    const message = apiErrorMessage(error);
    this.mutationErrorState.set(message);
    if (refresh) await this.reconcile();
    return { kind: 'error', message };
  }

  /** Releitura silenciosa: não volta para `loading` (sem skeleton no meio da tela). */
  private async reconcile(): Promise<void> {
    try {
      this.applyList(await firstValueFrom(this.api.getActiveList()));
    } catch {
      // Best-effort: a falha original já está visível e a releitura não é AC.
    }
  }

  private runMutation<T>(key: string, work: () => Promise<T>): Promise<T> {
    return this.singleFlight(key, async () => {
      this.busyState.update((count) => count + 1);
      try {
        return await work();
      } finally {
        this.busyState.update((count) => count - 1);
      }
    });
  }

  /** Chamadas simultâneas da mesma operação compartilham a requisição (AC-26). */
  private singleFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
    const running = this.inFlight.get(key) as Promise<T> | undefined;
    if (running) return running;

    const promise = work().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private openUndoWindow(pending: PendingUndo): void {
    this.closeUndoWindow();
    this.pendingUndoState.set(pending);
    this.undoTimer = setTimeout(() => {
      this.undoTimer = null;
      this.pendingUndoState.set(null);
    }, UNDO_WINDOW_MS);
  }

  private closeUndoWindow(): void {
    if (this.undoTimer !== null) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
    this.pendingUndoState.set(null);
  }
}
