// Fila de toasts (guia §5): confirmações com auto-dismiss ≈4s; erros ficam na
// tela até o descarte (AC-23). O host apenas renderiza o que está aqui.
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Toast, ToastAction } from './toast.model';

/** Auto-dismiss das confirmações (RN-08/guia §5: ≈4s). */
export const TOAST_CONFIRMATION_TIMEOUT_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly items = signal<Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();
    });
  }

  /** Confirmação: some sozinha em ≈4s, com ação opcional (ex.: "Desfazer"). */
  show(message: string, action?: ToastAction): number {
    return this.push({ message, variant: 'success', action }, TOAST_CONFIRMATION_TIMEOUT_MS);
  }

  /** Erro: permanece até o descarte. */
  error(message: string): number {
    return this.push({ message, variant: 'error' }, null);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Descarta o toast e só então executa a ação (a ação pode abrir outra UI). */
  runAction(id: number): void {
    const toast = this.items().find((item) => item.id === id);
    if (!toast) return;
    this.dismiss(id);
    toast.action?.run();
  }

  private push(toast: Omit<Toast, 'id'>, timeoutMs: number | null): number {
    const id = this.nextId++;
    this.items.update((toasts) => [...toasts, { ...toast, id }]);
    if (timeoutMs !== null) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), timeoutMs),
      );
    }
    return id;
  }
}
