import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import type { ItemUnit, PurchaseDetailResponse, PurchaseItem } from '@lista/contracts';
import { ITEM_UNITS } from '@lista/contracts';
import {
  digitsFromInput,
  digitsFromNumber,
  formatBrlFromDigits,
  formatDecimal,
  numberFromDigits,
  parseDecimal,
} from '../../shared/money/money';
import { BottomSheet, ToastService } from '../../ui';
import { apiErrorMessage } from '../shopping-list/data';
import { PriceHistoryStore } from './state';

interface DraftLine {
  key: number;
  name: string;
  quantity: string;
  unit: ItemUnit | '';
  priceDigits: string;
}

interface LineErrors {
  name: string | null;
  quantity: string | null;
  unit: string | null;
  price: string | null;
}

const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/** Mesma chave da comparação do histórico: caixa e acentos não distinguem o item. */
function normalizeName(name: string): string {
  return name.trim().normalize('NFKD').replace(COMBINING_DIACRITICS, '').toLowerCase();
}

/** Data de calendário local em `YYYY-MM-DD` — o mesmo limite do checkout. */
function localDateString(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return localDateString(date) === value;
}

function isUnit(value: string): value is ItemUnit {
  return (ITEM_UNITS as readonly string[]).includes(value);
}

function lineHasError(errors: LineErrors): boolean {
  return (
    errors.name !== null ||
    errors.quantity !== null ||
    errors.unit !== null ||
    errors.price !== null
  );
}

/**
 * Formulário de correção de uma compra já concluída. A validação local
 * impede o envio; o 400 do serviço, se chegar, fica visível sem descartar
 * o que foi digitado.
 */
@Component({
  selector: 'app-edit-purchase-sheet',
  imports: [BottomSheet],
  templateUrl: './edit-purchase-sheet.html',
  styleUrl: './edit-purchase-sheet.scss',
})
export class EditPurchaseSheet implements OnInit {
  private readonly store = inject(PriceHistoryStore);
  private readonly toast = inject(ToastService);

  readonly purchase = input.required<PurchaseDetailResponse>();
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly units = ITEM_UNITS;
  protected readonly today = localDateString();

  protected readonly market = signal('');
  protected readonly purchaseDate = signal('');
  protected readonly lines = signal<DraftLine[]>([]);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  private nextKey = 1;

  protected readonly priceDisplay = (digits: string): string => formatBrlFromDigits(digits);

  protected readonly errors = computed(() => {
    const lines = new Map<number, LineErrors>();
    if (!this.submitted()) {
      return { market: null as string | null, date: null as string | null, lines };
    }

    const market =
      this.market().trim() === '' ? 'Mercado é obrigatório' : null;
    let date: string | null = null;
    const purchaseDate = this.purchaseDate();
    if (purchaseDate === '') {
      date = 'Data da compra é obrigatória';
    } else if (!isCalendarDate(purchaseDate)) {
      date = 'Data da compra inválida';
    } else if (purchaseDate > this.today) {
      date = 'A data da compra não pode ser futura';
    }

    const seen = new Set<string>();
    for (const line of this.lines()) {
      const normalized = normalizeName(line.name);
      let name: string | null = null;
      if (normalized === '') {
        name = 'Informe o nome do item';
      } else if (seen.has(normalized)) {
        name = 'Já existe um item com esse nome nesta compra';
      } else {
        seen.add(normalized);
      }

      const quantityValue = parseDecimal(line.quantity);
      const quantity =
        quantityValue === null || !Number.isFinite(quantityValue) || quantityValue <= 0
          ? 'A quantidade precisa ser maior que zero'
          : null;
      const unit = isUnit(line.unit) ? null : 'Unidade inválida';
      const price = line.priceDigits === '' ? 'Informe o preço por unidade' : null;
      lines.set(line.key, { name, quantity, unit, price });
    }

    return { market, date, lines };
  });

  ngOnInit(): void {
    const purchase = this.purchase();
    this.market.set(purchase.market);
    this.purchaseDate.set(purchase.purchaseDate);
    this.lines.set(purchase.items.map((item) => this.draftFromItem(item)));
  }

  protected lineError(key: number): LineErrors | null {
    return this.errors().lines.get(key) ?? null;
  }

  protected onMarketInput(event: Event): void {
    this.market.set(readValue(event));
  }

  protected onDateInput(event: Event): void {
    this.purchaseDate.set(readValue(event));
  }

  protected onNameInput(key: number, event: Event): void {
    this.patchLine(key, { name: readValue(event) });
  }

  protected onQuantityInput(key: number, event: Event): void {
    this.patchLine(key, { quantity: readValue(event) });
  }

  protected onUnitChange(key: number, event: Event): void {
    const value = readValue(event);
    this.patchLine(key, { unit: isUnit(value) ? value : '' });
  }

  protected onPriceInput(key: number, event: Event): void {
    this.patchLine(key, { priceDigits: digitsFromInput(readValue(event)) });
  }

  protected addLine(): void {
    this.lines.update((lines) => [
      ...lines,
      { key: this.nextKey++, name: '', quantity: '', unit: '', priceDigits: '' },
    ]);
  }

  private draftFromItem(item: PurchaseItem): DraftLine {
    return {
      key: this.nextKey++,
      name: item.name,
      quantity: formatDecimal(item.quantity),
      unit: item.unit,
      priceDigits: digitsFromNumber(item.unitPrice),
    };
  }

  protected removeLine(key: number): void {
    this.lines.update((lines) => lines.filter((line) => line.key !== key));
  }

  protected cancel(): void {
    this.closed.emit();
  }

  protected async save(): Promise<void> {
    if (this.saving() || this.lines().length === 0) return;
    this.submitted.set(true);
    this.formError.set(null);
    const current = this.errors();
    const invalidLine = [...current.lines.values()].some(lineHasError);
    if (current.market !== null || current.date !== null || invalidLine) return;

    this.saving.set(true);
    try {
      await this.store.updatePurchase(this.purchase().id, {
        market: this.market().trim(),
        purchaseDate: this.purchaseDate(),
        items: this.toItems(),
      });
      this.toast.show('Compra atualizada');
      this.saved.emit();
    } catch (error) {
      this.formError.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private toItems(): PurchaseItem[] {
    return this.lines().map((line) => {
      const quantity = parseDecimal(line.quantity);
      const unitPrice = numberFromDigits(line.priceDigits);
      if (quantity === null || unitPrice === null || !isUnit(line.unit)) {
        throw new Error('linha inválida passou da validação');
      }
      return {
        name: line.name.trim(),
        quantity,
        unit: line.unit,
        unitPrice,
      };
    });
  }

  private patchLine(key: number, patch: Partial<DraftLine>): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }
}

function readValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ? target.value
    : '';
}
