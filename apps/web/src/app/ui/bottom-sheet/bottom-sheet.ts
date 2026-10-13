// Bottom sheet (guia §5): backdrop `--color-overlay`, painel `--radius-xl`,
// foco preso, fecha com botão visível e `Esc`. O estado aberto/fechado é do
// consumidor (`@if`), que reage ao output `closed`.
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CloseIcon } from '../icons';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let nextSheetId = 0;

@Component({
  selector: 'app-bottom-sheet',
  imports: [CloseIcon],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class BottomSheet implements AfterViewInit, OnDestroy {
  readonly heading = input.required<string>();
  /**
   * Fecha ao tocar o backdrop (default). Sheets de decisão explícita podem
   * desligar para exigir uma escolha (confirmar ou cancelar).
   */
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  protected readonly headingId = `bottom-sheet-${(nextSheetId += 1)}`;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private previouslyFocused: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.focusFirst();
  }

  ngOnDestroy(): void {
    // Sem devolver o foco, o teclado do celular/percurso por Tab se perde.
    this.previouslyFocused?.focus();
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop()) this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key === 'Tab') this.trapTab(event);
  }

  private focusFirst(): void {
    const first = this.panel().nativeElement.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? this.panel().nativeElement).focus();
  }

  private trapTab(event: KeyboardEvent): void {
    const panelElement = this.panel().nativeElement;
    const focusables = Array.from(
      panelElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );

    if (focusables.length === 0) {
      event.preventDefault();
      panelElement.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === panelElement) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
