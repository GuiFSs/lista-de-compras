import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { ItemUnit, MarkItemPurchasedRequest, ShoppingListItem } from '@lista/contracts';
import { ITEM_UNITS } from '@lista/contracts';
import { BottomSheet } from '../../ui';
import { ShoppingListStore } from './state';

/** Valores já digitados para um item, preservados na tela após desmarcar (RN-12/CD-04). */
export interface PurchaseDraft {
  purchasedQuantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

/** Decimal digitado com vírgula ou ponto (RN-06): `null` no campo vazio. */
function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? null : Number(normalized);
}

/** Mesmo formato aceito na digitação, para o prefill (vírgula decimal). */
function formatDecimal(value: number): string {
  return String(value).replace('.', ',');
}

/**
 * Sheet de marcar como comprado (guia §4 "Formulário de app"/§5): quantidade
 * comprada, unidade e preço por unidade são os três obrigatórios (RN-09). O
 * prefill vem do planejado (RN-13) — ou dos valores preservados, quando a pessoa
 * já digitou e desmarcou. Quantidade diferente da planejada pede confirmação
 * (RN-10/AC-14). A marcação é do store: aqui só se valida e se envia.
 */
@Component({
  selector: 'app-purchase-sheet',
  imports: [BottomSheet],
  templateUrl: './purchase-sheet.html',
  styleUrl: './purchase-sheet.scss',
})
export class PurchaseSheet implements OnInit, AfterViewInit {
  private readonly store = inject(ShoppingListStore);

  readonly item = input.required<ShoppingListItem>();
  /** Valores digitados antes de desmarcar; `null` usa o prefill do planejado. */
  readonly draft = input<PurchaseDraft | null>(null);

  readonly closed = output<void>();
  readonly purchased = output<void>();

  protected readonly heading = 'Marcar como comprado';
  protected readonly units = ITEM_UNITS;

  protected readonly quantityInput = signal('');
  protected readonly unit = signal<ItemUnit | ''>('');
  protected readonly priceInput = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly confirming = signal(false);

  protected readonly saving = computed(() => this.submitting() || this.store.saving());

  protected readonly quantityError = computed(() => {
    if (!this.submitted()) return null;
    const value = parseDecimal(this.quantityInput());
    if (value === null) return 'Informe a quantidade comprada.';
    if (Number.isNaN(value)) return 'Informe um número válido.';
    return value <= 0 ? 'A quantidade deve ser maior que zero.' : null;
  });

  protected readonly unitError = computed(() =>
    this.submitted() && this.unit() === '' ? 'Selecione a unidade.' : null,
  );

  protected readonly priceError = computed(() => {
    if (!this.submitted()) return null;
    const value = parseDecimal(this.priceInput());
    if (value === null) return 'Informe o preço por unidade.';
    if (Number.isNaN(value)) return 'Informe um número válido.';
    return value < 0 ? 'O preço não pode ser negativo.' : null;
  });

  protected readonly hasErrors = computed(() =>
    Boolean(this.quantityError() ?? this.unitError() ?? this.priceError()),
  );

  /** Aviso da confirmação (AC-14): informado × planejado. */
  protected readonly divergenceMessage = computed(() => {
    const item = this.item();
    const planned = item.plannedQuantity === null ? '' : formatDecimal(item.plannedQuantity);
    const plannedLabel = item.unit === null ? planned : `${planned} ${item.unit}`;
    return (
      `Você informou ${this.quantityInput().trim()} ${this.unit()}, mas o planejado era ` +
      `${plannedLabel}. Deseja marcar como comprado mesmo assim?`
    );
  });

  private readonly unitSelect = viewChild<ElementRef<HTMLSelectElement>>('unitSelect');

  ngOnInit(): void {
    const draft = this.draft();
    if (draft !== null) {
      this.quantityInput.set(formatDecimal(draft.purchasedQuantity));
      this.unit.set(draft.unit);
      this.priceInput.set(formatDecimal(draft.unitPrice));
      return;
    }

    const item = this.item();
    this.quantityInput.set(
      item.plannedQuantity === null ? '' : formatDecimal(item.plannedQuantity),
    );
    this.unit.set(item.unit ?? '');
    // RN-13: o preço por unidade começa vazio — o planejado é referência, não o pago.
  }

  ngAfterViewInit(): void {
    // Sem unidade planejada, o navegador marcaria a primeira opção; `selectedIndex
    // = -1` deixa o campo obrigatório visualmente vazio até a pessoa escolher.
    const select = this.unitSelect()?.nativeElement;
    if (select !== undefined && this.unit() === '') select.selectedIndex = -1;
  }

  protected onQuantityInput(event: Event): void {
    this.quantityInput.set((event.target as HTMLInputElement).value);
  }

  protected onUnitChange(event: Event): void {
    this.unit.set((event.target as HTMLSelectElement).value as ItemUnit | '');
  }

  protected onPriceInput(event: Event): void {
    this.priceInput.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  protected cancel(): void {
    this.closed.emit();
  }

  /** "Voltar" do aviso: ajustar os campos antes de confirmar (AC-14). */
  protected backToFields(): void {
    this.confirming.set(false);
  }

  /** Confirmado (sem divergência ou após o aviso): envia a marcação (AC-12/AC-26). */
  protected async confirmPurchase(): Promise<void> {
    const request = this.request();
    if (this.submitting() || request === null) return;

    this.confirming.set(false);
    this.submitting.set(true);
    try {
      const outcome = await this.store.markItemPurchased(this.item().id, request);
      if (outcome.kind === 'ok') this.purchased.emit();
    } finally {
      this.submitting.set(false);
    }
  }

  private async save(): Promise<void> {
    this.submitted.set(true);
    if (this.submitting() || this.hasErrors()) return;
    if (this.hasQuantityDivergence()) {
      this.confirming.set(true);
      return;
    }
    await this.confirmPurchase();
  }

  /** Só avisa quando existe quantidade planejada e ela difere da informada (RN-10). */
  private hasQuantityDivergence(): boolean {
    const planned = this.item().plannedQuantity;
    if (planned === null) return false;
    const quantity = parseDecimal(this.quantityInput());
    return quantity !== null && quantity !== planned;
  }

  private request(): MarkItemPurchasedRequest | null {
    const purchasedQuantity = parseDecimal(this.quantityInput());
    const unit = this.unit();
    const unitPrice = parseDecimal(this.priceInput());
    if (purchasedQuantity === null || Number.isNaN(purchasedQuantity)) return null;
    if (unit === '') return null;
    if (unitPrice === null || Number.isNaN(unitPrice)) return null;
    return { purchasedQuantity, unit, unitPrice };
  }
}
