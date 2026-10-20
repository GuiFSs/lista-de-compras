import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ShellChromeService } from '../../layout/shell-chrome';
import {
  formatPurchaseDate,
  formatQuantityWithUnit,
  formatUnitPrice,
} from './purchase-format';
import { PriceHistoryStore } from './state';

/** Skeleton na forma dos grupos (cabeçalho + linhas), nunca spinner sozinho. */
const SKELETON_GROUPS: readonly number[] = [0, 1];
const SKELETON_ROWS: readonly number[] = [0, 1];

/** Pausa da busca: um GET por pausa de digitação, não um por tecla (AC-09). */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Tela Menor preço (AC-01…AC-11/AC-13/AC-14): cada item distinto com o menor
 * preço por unidade já pago, no grupo do mercado da compra vencedora. Grupos,
 * ordem, metadados e busca chegam prontos do serviço (RN-05/RN-12): a tela só
 * apresenta a resposta, sem agrupar, filtrar nem reordenar no cliente.
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
  protected readonly groups = computed(() => this.store.lowestPrices().data);
  protected readonly loadError = computed(
    () => this.store.lowestPrices().error,
  );
  protected readonly query = computed(() => this.store.lowestPrices().query);

  protected readonly searchTerm = signal('');

  /** Skeleton só sem dados: voltar do drill-down não pisca a lista (AC-13). */
  protected readonly showSkeleton = computed(
    () => this.status() === 'loading' && this.groups().length === 0,
  );

  protected readonly skeletonGroups = SKELETON_GROUPS;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly formatDate = formatPurchaseDate;
  protected readonly formatQuantityWithUnit = formatQuantityWithUnit;
  protected readonly formatUnitPrice = formatUnitPrice;

  /** Apoio do topo (guia §4): quanto a busca retornou, com o termo quando há. */
  protected readonly summary = computed(() => {
    const count = this.groups().reduce(
      (total, group) => total + group.items.length,
      0,
    );
    const label = count === 1 ? '1 item' : `${count} itens`;
    const term = this.query();
    return term === '' ? label : `${label} para "${term}"`;
  });

  constructor() {
    this.chrome.contribute(
      { title: 'Menor preço', actions: [] },
      this.destroyRef,
    );

    // Sem distinctUntilChanged: repetir um termo (digitar, apagar, digitar de
    // novo) refaz o GET de propósito; o trim já corta os vazios redundantes.
    this.searchTerms
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => void this.store.loadLowestPrices(term));

    // CD-10: ao entrar, repete a última busca (o store preserva termo e lista)
    // em vez de recarregar a lista completa e descartar o filtro.
    this.searchTerm.set(this.query());
    void this.store.loadLowestPrices(this.query());
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
