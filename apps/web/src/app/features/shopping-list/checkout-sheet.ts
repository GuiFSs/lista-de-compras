import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import type { CheckoutShoppingListRequest } from '@lista/contracts';
import { BottomSheet } from '../../ui';
import { ShoppingListStore } from './state';

/** Data de calendário local em `YYYY-MM-DD` (RN-04: hoje no fuso da pessoa). */
export function localDateString(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Rejeita formatos que o `type="date"` não deveria produzir, mas que o DOM aceita (ex.: `2026-02-31`). */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return localDateString(date) === value;
}

/**
 * Sheet de conclusão da compra: resume quantos itens comprados saem e quantos
 * permanecem; com ≥1 comprado pede mercado e data da compra (RN-03/RN-04),
 * com validação local antes do envio. Sem comprados não há campos nem payload
 * (RN-09). O single-flight da conclusão é do store (AC-20) — aqui só o rótulo
 * de progresso e o desabilitado do CTA.
 */
@Component({
  selector: 'app-checkout-sheet',
  imports: [BottomSheet],
  templateUrl: './checkout-sheet.html',
  styleUrl: './checkout-sheet.scss',
})
export class CheckoutSheet implements OnInit {
  private readonly store = inject(ShoppingListStore);

  /** Prefill da nota (AC-07); vazio/null = comportamento anterior. */
  readonly initialMarket = input<string | null>(null);
  readonly initialPurchaseDate = input<string | null>(null);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  protected readonly leaving = this.store.purchasedCount;
  protected readonly remaining = this.store.pendingCount;
  protected readonly concluding = this.store.concluding;

  protected readonly today = localDateString();
  protected readonly market = signal('');
  protected readonly purchaseDate = signal(this.today);
  protected readonly submitted = signal(false);

  ngOnInit(): void {
    const market = this.initialMarket();
    if (market !== null && market.trim() !== '') {
      this.market.set(market.trim());
    }
    const date = this.initialPurchaseDate();
    if (date !== null && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= this.today) {
      this.purchaseDate.set(date);
    }
  }

  // Espelha as mensagens do envelope 400 do serviço (PLAN, "Contratos").
  protected readonly marketError = computed(() =>
    this.submitted() && this.market().trim() === '' ? 'Mercado é obrigatório' : null,
  );

  protected readonly dateError = computed(() => {
    if (!this.submitted()) return null;
    const value = this.purchaseDate();
    if (value === '') return 'Data da compra é obrigatória';
    if (!isCalendarDate(value)) return 'Data da compra inválida';
    // `YYYY-MM-DD` com zeros à esquerda compara corretamente como texto.
    return value > this.today ? 'Data da compra não pode ser futura' : null;
  });

  protected readonly hasErrors = computed(
    () => this.marketError() !== null || this.dateError() !== null,
  );

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

  protected onMarketInput(event: Event): void {
    this.market.set((event.target as HTMLInputElement).value);
  }

  protected onDateInput(event: Event): void {
    this.purchaseDate.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.confirm();
  }

  protected cancel(): void {
    this.closed.emit();
  }

  /** Confirma a conclusão (AC-19/AC-20): quem remove é o serviço, via store (RN-19). */
  protected async confirm(): Promise<void> {
    if (this.concluding()) return;

    let request: CheckoutShoppingListRequest | null = null;
    if (this.leaving() > 0) {
      this.submitted.set(true);
      if (this.hasErrors()) return;
      request = { market: this.market().trim(), purchaseDate: this.purchaseDate() };
    }

    const outcome = await this.store.checkout(request);
    if (outcome.kind === 'ok') this.confirmed.emit();
  }
}
