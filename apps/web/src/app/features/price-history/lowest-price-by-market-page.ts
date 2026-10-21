import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { isObservable } from 'rxjs';
import { ShellChromeService } from '../../layout/shell-chrome';
import {
  formatPurchaseDate,
  formatQuantityWithUnit,
  formatUnitPrice,
} from './purchase-format';
import { PriceHistoryStore } from './state';

const FALLBACK_TITLE = 'Menor preço';
const SKELETON_ROWS: readonly number[] = [0, 1, 2];

/**
 * Menor preço por mercado — tela do item (AC-05…AC-08/AC-12…AC-14/AC-16).
 * Uma linha por mercado, exatamente na ordem do serviço (RN-06/RN-12): a tela
 * não agrega, não normaliza e não reordena. O `:item` chega decodificado pelo
 * router e é repassado cru ao store; quem percent-encoda é a borda de dados.
 */
@Component({
  selector: 'app-lowest-price-by-market-page',
  imports: [RouterLink],
  templateUrl: './lowest-price-by-market-page.html',
  styleUrl: './lowest-price-by-market-page.scss',
})
export class LowestPriceByMarketPage {
  private readonly store = inject(PriceHistoryStore);
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly status = computed(
    () => this.store.itemLowestPrices().status,
  );
  protected readonly item = computed(() => this.store.itemLowestPrices().data);
  protected readonly loadError = computed(
    () => this.store.itemLowestPrices().error,
  );

  protected readonly showSkeleton = computed(() => this.status() === 'loading');
  /** 200 sem mercados também cai em "não encontrado": nunca tela em branco. */
  protected readonly showNotFound = computed(
    () =>
      this.status() === 'notFound' ||
      (this.status() === 'loaded' && (this.item()?.markets.length ?? 0) === 0),
  );

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly formatDate = formatPurchaseDate;
  protected readonly formatQuantityWithUnit = formatQuantityWithUnit;
  protected readonly formatUnitPrice = formatUnitPrice;

  private contributedTitle = FALLBACK_TITLE;

  constructor() {
    this.chrome.contribute(
      { title: FALLBACK_TITLE, actions: [] },
      this.destroyRef,
    );

    // O nome de exibição só existe depois da resposta; a app bar o acompanha.
    // Cada contribuição registra o mesmo reset no destroy (idempotente).
    effect(() => {
      const title = this.item()?.name ?? FALLBACK_TITLE;
      if (title === this.contributedTitle) return;
      this.contributedTitle = title;
      this.chrome.contribute({ title, actions: [] }, this.destroyRef);
    });

    const paramMap = (this.route as unknown as { paramMap?: unknown }).paramMap;
    const loadFromParams = (params: ParamMap) => {
      const item = params.get('item');
      if (item !== null) void this.store.loadItemLowestPrices(item);
    };

    if (paramMap && isObservable(paramMap)) {
      (paramMap as import('rxjs').Observable<ParamMap>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(loadFromParams);
      return;
    }

    if (paramMap && typeof (paramMap as ParamMap).get === 'function') {
      loadFromParams(paramMap as ParamMap);
      return;
    }

    const snapshotParamMap = (
      this.route as unknown as { snapshot?: { paramMap?: unknown } }
    ).snapshot?.paramMap;
    if (
      snapshotParamMap &&
      typeof (snapshotParamMap as ParamMap).get === 'function'
    ) {
      loadFromParams(snapshotParamMap as ParamMap);
      return;
    }

    const firstChildSnapshot = (
      this.route as unknown as {
        firstChild?: { snapshot?: { paramMap?: unknown } };
      }
    ).firstChild?.snapshot?.paramMap;
    if (
      firstChildSnapshot &&
      typeof (firstChildSnapshot as ParamMap).get === 'function'
    ) {
      loadFromParams(firstChildSnapshot as ParamMap);
    }
  }

  /** Retry sem argumento: o store repete a MESMA consulta (AC-14). */
  protected retry(): void {
    void this.store.loadItemLowestPrices();
  }
}
