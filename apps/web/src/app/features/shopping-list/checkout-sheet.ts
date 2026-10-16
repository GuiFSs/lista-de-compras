import { Component, computed, inject, output, signal } from '@angular/core';
import { BottomSheet } from '../../ui';
import { ShoppingListStore } from './state';

/**
 * Sheet de conclusão da compra (RN-14/CD-09): o resumo diz quantos itens
 * comprados saem e quantos permanecem — só a confirmação remove algo. Nesta
 * rodada não há mercado nem data (RN-16/AC-21) e é permitido concluir sem
 * nenhum comprado (RN-15): aí a lista fica como está.
 */
@Component({
  selector: 'app-checkout-sheet',
  imports: [BottomSheet],
  templateUrl: './checkout-sheet.html',
  styleUrl: './checkout-sheet.scss',
})
export class CheckoutSheet {
  private readonly store = inject(ShoppingListStore);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  protected readonly leaving = this.store.purchasedCount;
  protected readonly remaining = this.store.pendingCount;
  protected readonly submitting = signal(false);

  protected readonly saving = computed(() => this.submitting() || this.store.saving());

  protected readonly lead = computed(() =>
    this.leaving() === 0
      ? 'Nenhum item está marcado como comprado: a lista continua como está.'
      : 'Os itens comprados saem da lista; os demais ficam para a próxima compra.',
  );

  protected readonly leavingText = computed(() => {
    const count = this.leaving();
    if (count === 0) return 'Nenhum item sai da lista.';
    if (count === 1) return '1 item comprado sai da lista.';
    return `${count} itens comprados saem da lista.`;
  });

  protected readonly remainingText = computed(() => {
    const count = this.remaining();
    if (count === 0) return 'Nenhum item permanece na lista.';
    if (count === 1) return '1 item permanece na lista.';
    return `${count} itens permanecem na lista.`;
  });

  protected cancel(): void {
    this.closed.emit();
  }

  /** Confirma a conclusão (AC-19/AC-20): quem remove é o serviço, via store (RN-19). */
  protected async confirm(): Promise<void> {
    if (this.submitting() || this.store.saving()) return;

    this.submitting.set(true);
    try {
      const outcome = await this.store.checkout();
      if (outcome.kind === 'ok') this.confirmed.emit();
    } finally {
      this.submitting.set(false);
    }
  }
}
