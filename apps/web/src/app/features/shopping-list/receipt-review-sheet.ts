import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  ApplyReceiptLineRequest,
  ItemUnit,
  RecognizeReceiptResponse,
  RecognizedReceiptLine,
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
import { ShoppingListStore } from './state';

interface ReviewLine {
  key: string;
  include: boolean;
  name: string;
  quantityInput: string;
  unit: ItemUnit | '';
  unitPriceDigits: string;
}

function lineFromRecognized(line: RecognizedReceiptLine, index: number): ReviewLine {
  return {
    key: `line-${index}`,
    include: true,
    name: line.name ?? '',
    quantityInput: line.quantity === null ? '' : formatDecimal(line.quantity),
    unit: line.unit ?? '',
    unitPriceDigits: line.unitPrice === null ? '' : digitsFromNumber(line.unitPrice),
  };
}

function isLineComplete(line: ReviewLine): boolean {
  if (line.name.trim() === '') return false;
  const quantity = parseDecimal(line.quantityInput);
  if (quantity === null || quantity <= 0) return false;
  if (line.unit === '') return false;
  if (line.unitPriceDigits === '') return false;
  const price = numberFromDigits(line.unitPriceDigits);
  return price !== null && price >= 0;
}

/**
 * Revisão da nota (formulário de app): completa o que faltou e confirma o apply
 * com substituição (CD-03/CD-04).
 */
@Component({
  selector: 'app-receipt-review-sheet',
  imports: [BottomSheet],
  templateUrl: './receipt-review-sheet.html',
  styleUrl: './receipt-review-sheet.scss',
})
export class ReceiptReviewSheet implements OnInit {
  private readonly store = inject(ShoppingListStore);

  readonly receipt = input.required<RecognizeReceiptResponse>();

  readonly closed = output<void>();
  readonly applied = output<{ market: string | null; purchaseDate: string | null }>();

  protected readonly units = ITEM_UNITS;
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly lines = signal<ReviewLine[]>([]);
  protected readonly market = signal('');
  protected readonly purchaseDate = signal('');

  protected readonly empty = computed(() => this.lines().length === 0);
  protected readonly applicableCount = computed(
    () => this.lines().filter((line) => line.include && isLineComplete(line)).length,
  );
  protected readonly canSubmit = computed(() => this.applicableCount() > 0 && !this.submitting());

  ngOnInit(): void {
    const receipt = this.receipt();
    this.market.set(receipt.market ?? '');
    this.purchaseDate.set(receipt.purchaseDate ?? '');
    this.lines.set(receipt.lines.map(lineFromRecognized));
  }

  protected priceDisplay(line: ReviewLine): string {
    return formatBrlFromDigits(line.unitPriceDigits);
  }

  protected lineComplete(line: ReviewLine): boolean {
    return isLineComplete(line);
  }

  protected onIncludeChange(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.patchLine(key, { include: checked });
  }

  protected onNameInput(key: string, event: Event): void {
    this.patchLine(key, { name: (event.target as HTMLInputElement).value });
  }

  protected onQuantityInput(key: string, event: Event): void {
    this.patchLine(key, { quantityInput: (event.target as HTMLInputElement).value });
  }

  protected onUnitChange(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.patchLine(key, { unit: value === '' ? '' : (value as ItemUnit) });
  }

  protected onPriceInput(key: string, event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.patchLine(key, { unitPriceDigits: digitsFromInput(inputEl.value) });
  }

  protected onPriceBeforeInput(key: string, event: InputEvent): void {
    void key;
    if (event.inputType.startsWith('delete') || event.inputType === 'insertFromPaste') {
      return;
    }
    if (event.data !== null && /\D/.test(event.data)) {
      event.preventDefault();
    }
  }

  protected onMarketInput(event: Event): void {
    this.market.set((event.target as HTMLInputElement).value);
  }

  protected onDateInput(event: Event): void {
    this.purchaseDate.set((event.target as HTMLInputElement).value);
  }

  protected cancel(): void {
    this.closed.emit();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.confirm();
  }

  protected async confirm(): Promise<void> {
    if (!this.canSubmit()) {
      this.submitted.set(true);
      return;
    }
    this.submitted.set(true);
    this.submitting.set(true);
    try {
      const payloadLines: ApplyReceiptLineRequest[] = this.lines().map((line) => {
        const complete = isLineComplete(line);
        const quantity = parseDecimal(line.quantityInput) ?? 0;
        const unitPrice = numberFromDigits(line.unitPriceDigits) ?? 0;
        return {
          name: line.name.trim(),
          quantity,
          unit: line.unit === '' ? 'unidade' : line.unit,
          unitPrice,
          include: line.include && complete,
        };
      });

      const outcome = await this.store.applyReceiptPurchase({
        market: this.market().trim() || null,
        purchaseDate: this.purchaseDate().trim() || null,
        lines: payloadLines,
      });
      if (outcome.kind !== 'ok') return;
      this.applied.emit({
        market: this.market().trim() || null,
        purchaseDate: this.purchaseDate().trim() || null,
      });
    } finally {
      this.submitting.set(false);
    }
  }

  private patchLine(key: string, patch: Partial<ReviewLine>): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }
}
