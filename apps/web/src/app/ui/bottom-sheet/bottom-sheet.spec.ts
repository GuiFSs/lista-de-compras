import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomSheet } from './bottom-sheet';

@Component({
  selector: 'app-test-sheet-host',
  imports: [BottomSheet],
  template: `
    <app-bottom-sheet heading="Adicionar item" (closed)="closeCount = closeCount + 1">
      <button type="button" class="action-save">Salvar</button>
      <button type="button" class="action-cancel">Cancelar</button>
    </app-bottom-sheet>
  `,
})
class SheetHost {
  closeCount = 0;
}

@Component({
  selector: 'app-test-sticky-sheet-host',
  imports: [BottomSheet],
  template: `
    <app-bottom-sheet
      heading="Concluir compra"
      [closeOnBackdrop]="false"
      (closed)="closeCount = closeCount + 1"
    >
      <button type="button">Confirmar</button>
    </app-bottom-sheet>
  `,
})
class StickySheetHost {
  closeCount = 0;
}

function mount<T>(type: Type<T>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(type);
  // Foco só existe com o elemento conectado ao documento.
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return fixture;
}

function pressKey(target: Element, key: string, shiftKey = false): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
  );
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = fixture.nativeElement.querySelector(selector) as T | null;
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
}

describe('BottomSheet', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renderiza um diálogo modal nomeado pelo título', () => {
    const fixture = mount(SheetHost);
    const panel = query<HTMLElement>(fixture, '.bottom-sheet__panel');
    const labelledBy = panel.getAttribute('aria-labelledby');

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(labelledBy).toBeTruthy();
    expect(query<HTMLElement>(fixture, `#${labelledBy}`).textContent?.trim()).toBe('Adicionar item');
  });

  it('coloca o foco no primeiro elemento do sheet ao abrir', () => {
    const fixture = mount(SheetHost);

    expect(document.activeElement).toBe(query(fixture, '.bottom-sheet__close'));
  });

  it('prende o foco: Tab do último volta para o primeiro', () => {
    const fixture = mount(SheetHost);
    const last = query<HTMLElement>(fixture, '.action-cancel');
    last.focus();
    expect(document.activeElement).toBe(last);

    pressKey(last, 'Tab');

    expect(document.activeElement).toBe(query(fixture, '.bottom-sheet__close'));
  });

  it('prende o foco: Shift+Tab do primeiro vai para o último', () => {
    const fixture = mount(SheetHost);
    const first = query<HTMLElement>(fixture, '.bottom-sheet__close');
    first.focus();
    expect(document.activeElement).toBe(first);

    pressKey(first, 'Tab', true);

    expect(document.activeElement).toBe(query(fixture, '.action-cancel'));
  });

  it('fecha com o botão visível (com aria-label)', () => {
    const fixture = mount(SheetHost);
    const close = query<HTMLButtonElement>(fixture, '.bottom-sheet__close');

    expect(close.getAttribute('aria-label')).toBe('Fechar');
    close.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closeCount).toBe(1);
  });

  it('fecha com Esc', () => {
    const fixture = mount(SheetHost);

    pressKey(query(fixture, '.bottom-sheet__panel'), 'Escape');
    fixture.detectChanges();

    expect(fixture.componentInstance.closeCount).toBe(1);
  });

  it('fecha ao tocar o backdrop por padrão', () => {
    const fixture = mount(SheetHost);

    query<HTMLElement>(fixture, '.bottom-sheet__backdrop').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closeCount).toBe(1);
  });

  it('não fecha no backdrop quando a decisão é explícita', () => {
    const fixture = mount(StickySheetHost);

    query<HTMLElement>(fixture, '.bottom-sheet__backdrop').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closeCount).toBe(0);
  });

  it('devolve o foco ao elemento anterior ao ser destruído', () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    document.body.appendChild(trigger);
    trigger.focus();

    const fixture = mount(SheetHost);
    expect(document.activeElement).not.toBe(trigger);

    fixture.destroy();

    expect(document.activeElement).toBe(trigger);
  });
});
