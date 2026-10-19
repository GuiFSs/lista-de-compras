import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ShellChromeService } from '../../layout/shell-chrome';
import { formatUnitPrice } from './purchase-format';
import { PriceHistoryStore } from './state';

/** Skeleton na forma das linhas nome+preço (AC-13), nunca spinner sozinho. */
const SKELETON_ROWS: readonly number[] = [0, 1, 2];

/** Pausa da busca: um GET por pausa de digitação, não um por tecla (AC-09). */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Tela Menor preço (AC-08…AC-10): cada item distinto com o menor preço por
 * unidade já pago. Busca (`q`), agregação e nome de exibição são do serviço
 * (RN-06/RN-07) — a tela envia o termo e apresenta a resposta sem filtro nem
 * reordenação no cliente.
 */
@Component({
  selector: 'app-lowest-price-page',
  imports: [RouterLink],
  templateUrl: './lowest-price-page.html',
  styleUrl: './lowest-price-page.scss',
})
export class LowestPricePage {
  private readonly store = inject(PriceHistoryStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchTerms = new Subject<string>();

  protected readonly status = computed(() => this.store.lowestPrices().status);
  protected readonly items = computed(() => this.store.lowestPrices().data);
  protected readonly loadError = computed(() => this.store.lowestPrices().error);
  protected readonly query = computed(() => this.store.lowestPrices().query);

  protected readonly searchTerm = signal('');

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly formatUnitPrice = formatUnitPrice;

  /** Apoio do topo (guia §4): quanto a busca retornou, com o termo quando há. */
  protected readonly summary = computed(() => {
    const count = this.items().length;
    const label = count === 1 ? '1 item' : `${count} itens`;
    const term = this.query();
    return term === '' ? label : `${label} para "${term}"`;
  });

  constructor() {
    this.chrome.contribute({ title: 'Menor preço', actions: [] }, this.destroyRef);

    // Sem distinctUntilChanged: repetir um termo (digitar, apagar, digitar de
    // novo) refaz o GET de propósito; o trim já corta os vazios redundantes.
    this.searchTerms
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => void this.store.loadLowestPrices(term));

    // Toda entrada na tela parte da lista completa: o campo nasce limpo (AC-08).
    void this.store.loadLowestPrices('');
  }

  protected onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value.trim();
    this.searchTerm.set(term);
    this.searchTerms.next(term);
  }

  /** "Limpar busca" do empty de busca: volta à lista completa sem o debounce. */
  protected clearSearch(): void {
    this.searchTerm.set('');
    void this.store.loadLowestPrices('');
  }

  /** "Tentar novamente" (AC-14): sem termo, o store refaz a MESMA busca. */
  protected retry(): void {
    void this.store.loadLowestPrices();
  }
}
