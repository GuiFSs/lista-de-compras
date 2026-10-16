import {
  Component,
  ElementRef,
  AfterViewInit,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  CreateShoppingListItemRequest,
  ItemUnit,
  ShoppingListItem,
  UpdateShoppingListItemRequest,
} from '@lista/contracts';
import { ITEM_UNITS } from '@lista/contracts';
import {
  digitsFromInput,
  digitsFromNumber,
  formatBrlFromDigits,
  formatDecimal,
  numberFromDigits,
  parseDecimal,
} from '../../shared/money/money';
import { BottomSheet } from '../../ui';
import type { DuplicateOf } from './data';
import { ShoppingListStore } from './state';

export type ItemFormMode = 'create' | 'edit';

/**
 * Formulário de item (guia §5): um bottom sheet para adicionar e editar. A
 * validação é local (não envia requisição inválida) e o 409 tem dois fluxos:
 * na **criação** pergunta se soma ao existente (AC-07/CD-02); na **edição** é
 * conflito terminal mostrado no formulário, sem soma (AC-08/CD-13). O erro de
 * rede fica na tela (persistente) — a tela consome `mutationError` do store.
 */
@Component({
  selector: 'app-item-form-sheet',
  imports: [BottomSheet],
  templateUrl: './item-form-sheet.html',
  styleUrl: './item-form-sheet.scss',
})
export class ItemFormSheet implements OnInit, AfterViewInit {
  private readonly store = inject(ShoppingListStore);

  readonly mode = input.required<ItemFormMode>();
  readonly item = input<ShoppingListItem | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly units = ITEM_UNITS;

  protected readonly name = signal('');
  protected readonly plannedQuantityInput = signal('');
  protected readonly unit = signal<ItemUnit | ''>('');
  /** Estado de verdade do preço: só os dígitos, em centavos (RN-21). Exibição e payload derivam dele. */
  protected readonly plannedPriceDigits = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly conflict = signal<string | null>(null);
  protected readonly duplicate = signal<DuplicateOf | null>(null);

  protected readonly heading = computed(() =>
    this.mode() === 'create' ? 'Adicionar item' : 'Editar item',
  );
  protected readonly saving = computed(() => this.submitting() || this.store.saving());
  protected readonly plannedPriceDisplay = computed(() =>
    formatBrlFromDigits(this.plannedPriceDigits()),
  );

  protected readonly nameError = computed(() =>
    this.submitted() && this.name().trim() === '' ? 'Informe o nome do item.' : null,
  );
  protected readonly quantityError = computed(() =>
    this.optionalNumberError(this.plannedQuantityInput(), (value) =>
      value <= 0 ? 'A quantidade deve ser maior que zero.' : null,
    ),
  );
  protected readonly priceError = computed(() => {
    if (!this.submitted()) return null;
    // Defensivo (RN-06/CD-08): a máscara só forma dígitos, então a digitação
    // nunca produz valor negativo (RN-21) — o caminho fica inalcançável pela UI.
    const price = numberFromDigits(this.plannedPriceDigits());
    return price !== null && price < 0 ? 'O preço não pode ser negativo.' : null;
  });

  protected readonly hasErrors = computed(() =>
    Boolean(this.nameError() ?? this.quantityError() ?? this.priceError()),
  );

  /** Guarda o request da criação para reenviar a soma quando a pessoa confirma (CD-02). */
  private pendingCreate: CreateShoppingListItemRequest | null = null;

  private readonly unitSelect = viewChild<ElementRef<HTMLSelectElement>>('unitSelect');

  ngOnInit(): void {
    const item = this.item();
    if (this.mode() !== 'edit' || item === null) return;

    this.name.set(item.name);
    this.plannedQuantityInput.set(
      item.plannedQuantity === null ? '' : formatDecimal(item.plannedQuantity),
    );
    this.unit.set(item.unit ?? '');
    this.plannedPriceDigits.set(
      item.plannedPrice === null ? '' : digitsFromNumber(item.plannedPrice),
    );
  }

  ngAfterViewInit(): void {
    // `[selected]` marca a opção da unidade, mas quando não há unidade todas ficam
    // desmarcadas e o navegador seleciona a primeira. `selectedIndex = -1` preserva
    // o campo opcional visualmente vazio em vez de exibir "unidade" no payload nulo
    // (AC-04); roda depois de o `@for` criar as opções, o que o binding não garante.
    const select = this.unitSelect()?.nativeElement;
    if (select !== undefined && this.unit() === '') select.selectedIndex = -1;
  }

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    // O conflito de edição some quando a pessoa corrige o nome para tentar de novo.
    this.conflict.set(null);
  }

  protected onQuantityInput(event: Event): void {
    this.plannedQuantityInput.set((event.target as HTMLInputElement).value);
  }

  protected onUnitChange(event: Event): void {
    this.unit.set((event.target as HTMLSelectElement).value as ItemUnit | '');
  }

  protected onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.plannedPriceDigits.set(this.digitsFromField(input.value));
    this.renderPrice(input);
  }

  protected onPriceBeforeInput(event: Event): void {
    if (!(event instanceof InputEvent) || event.inputType !== 'deleteContentBackward') return;

    // Um backspace apaga um dígito: recomputar pelo texto formatado consumiria
    // caracteres da máscara (em `R$ 0,03` sobraria `00`) e exigiria vários toques.
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    this.plannedPriceDigits.update((digits) => digits.slice(0, -1));
    this.renderPrice(input);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  protected cancel(): void {
    this.closed.emit();
  }

  /** Confirma a soma ao item existente (AC-07): o serviço soma, não o cliente. */
  protected async confirmSum(): Promise<void> {
    const request = this.pendingCreate;
    if (this.submitting() || request === null) return;

    this.submitting.set(true);
    try {
      const outcome = await this.store.createItem({
        ...request,
        duplicateResolution: 'sum-planned-quantity',
      });
      if (outcome.kind === 'created') this.saved.emit();
      else if (outcome.kind === 'duplicate') this.duplicate.set(outcome.duplicateOf);
    } finally {
      this.submitting.set(false);
    }
  }

  /** Recusar a soma não muda nada: fecha a pergunta e o formulário segue com o digitado. */
  protected rejectSum(): void {
    this.duplicate.set(null);
  }

  private async save(): Promise<void> {
    this.submitted.set(true);
    this.conflict.set(null);

    if (this.submitting() || this.hasErrors()) return;
    if (this.mode() === 'create') await this.create();
    else await this.update();
  }

  private async create(): Promise<void> {
    this.duplicate.set(null);
    this.submitting.set(true);
    this.pendingCreate = {
      name: this.name().trim(),
      plannedQuantity: parseDecimal(this.plannedQuantityInput()),
      unit: this.selectedUnit(),
      plannedPrice: numberFromDigits(this.plannedPriceDigits()),
    };

    try {
      const outcome = await this.store.createItem(this.pendingCreate);
      if (outcome.kind === 'created') this.saved.emit();
      else if (outcome.kind === 'duplicate') this.duplicate.set(outcome.duplicateOf);
    } finally {
      this.submitting.set(false);
    }
  }

  private async update(): Promise<void> {
    const item = this.item();
    if (item === null) return;

    this.submitting.set(true);
    const request: UpdateShoppingListItemRequest = {
      name: this.name().trim(),
      plannedQuantity: parseDecimal(this.plannedQuantityInput()),
      unit: this.selectedUnit(),
      plannedPrice: numberFromDigits(this.plannedPriceDigits()),
    };

    try {
      const outcome = await this.store.updateItem(item.id, request);
      if (outcome.kind === 'updated') this.saved.emit();
      else if (outcome.kind === 'conflict') this.conflict.set('Já existe um item com esse nome');
    } finally {
      this.submitting.set(false);
    }
  }

  private selectedUnit(): ItemUnit | null {
    const unit = this.unit();
    return unit === '' ? null : unit;
  }

  /**
   * Dígitos digitados/colados sem os zeros que a própria máscara insere à esquerda
   * (`R$ 0,03` contém `003`); sem normalizar, cada evento somaria um zero e o
   * backspace precisaria de mais de um toque para esvaziar o campo (RN-21).
   */
  private digitsFromField(raw: string): string {
    return digitsFromInput(raw).replace(/^0+(?=\d)/, '');
  }

  /**
   * O `[value]` só reescreve o campo quando a máscara muda; gravar no DOM cobre o
   * caso em que os dígitos não mudam (ex.: letra digitada) e mantém o caret no fim.
   */
  private renderPrice(input: HTMLInputElement): void {
    input.value = this.plannedPriceDisplay();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  private optionalNumberError(
    raw: string,
    check: (value: number) => string | null,
  ): string | null {
    if (!this.submitted()) return null;
    const value = parseDecimal(raw);
    if (value === null) return null;
    if (Number.isNaN(value)) return 'Informe um número válido.';
    return check(value);
  }
}
