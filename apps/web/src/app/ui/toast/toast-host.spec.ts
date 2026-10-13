import { TestBed } from '@angular/core/testing';
import { TOAST_CONFIRMATION_TIMEOUT_MS, ToastService } from './toast';
import { ToastHost } from './toast-host';

describe('ToastHost', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [ToastHost] });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não renderiza toast sem confirmação nem erro', () => {
    const fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });

  it('renderiza a confirmação como status, com a ação "Desfazer" (AC-11)', () => {
    service.show('Item excluído', { label: 'Desfazer', run: vi.fn() });
    const fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement | null;
    const action = fixture.nativeElement.querySelector(
      '.toast__action',
    ) as HTMLButtonElement | null;

    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('status');
    expect(toast?.textContent).toContain('Item excluído');
    expect(action?.textContent?.trim()).toBe('Desfazer');
  });

  it('executa a ação e remove o toast da tela ao tocar em "Desfazer"', () => {
    const undo = vi.fn();
    service.show('Item excluído', { label: 'Desfazer', run: undo });
    const fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.toast__action') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(undo).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });

  it('renderiza o erro como alert e o mantém até o descarte (AC-23)', () => {
    service.error('Erro de rede. Tente novamente.');
    const fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement | null;
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.classList.contains('toast--error')).toBe(true);

    vi.advanceTimersByTime(TOAST_CONFIRMATION_TIMEOUT_MS * 10);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast')).not.toBeNull();
  });

  it('remove o toast ao tocar em "Dispensar" (com aria-label)', () => {
    service.error('Erro de rede. Tente novamente.');
    const fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();

    const dismiss = fixture.nativeElement.querySelector(
      '.toast__dismiss',
    ) as HTMLButtonElement;
    expect(dismiss.getAttribute('aria-label')).toBe('Dispensar');

    dismiss.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });
});
