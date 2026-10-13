import { TestBed } from '@angular/core/testing';
import { TOAST_CONFIRMATION_TIMEOUT_MS, ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exibe a confirmação e some sozinha em ≈4s (guia §5)', () => {
    service.show('Item adicionado');
    expect(service.toasts().map((toast) => toast.message)).toEqual(['Item adicionado']);

    vi.advanceTimersByTime(TOAST_CONFIRMATION_TIMEOUT_MS - 1);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('mantém o erro na tela até o descarte (AC-23)', () => {
    const id = service.error('Erro de rede. Tente novamente.');

    vi.advanceTimersByTime(TOAST_CONFIRMATION_TIMEOUT_MS * 10);
    expect(service.toasts()).toHaveLength(1);

    service.dismiss(id);
    expect(service.toasts()).toHaveLength(0);
  });

  it('dispara a ação do toast e o descarta (AC-11 — Desfazer)', () => {
    const undo = vi.fn();
    const id = service.show('Item excluído', { label: 'Desfazer', run: undo });

    service.runAction(id);

    expect(undo).toHaveBeenCalledTimes(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('descarta na hora sem deixar timer pendente para o item', () => {
    const id = service.show('Item atualizado');
    service.dismiss(id);

    vi.advanceTimersByTime(TOAST_CONFIRMATION_TIMEOUT_MS);
    expect(service.toasts()).toHaveLength(0);
  });

  it('empilha confirmações na ordem em que foram exibidas', () => {
    service.show('Item adicionado');
    service.show('Item atualizado');

    expect(service.toasts().map((toast) => toast.message)).toEqual([
      'Item adicionado',
      'Item atualizado',
    ]);
  });

  it('não quebra ao executar a ação de um toast que já saiu', () => {
    const undo = vi.fn();
    service.show('Item excluído', { label: 'Desfazer', run: undo });

    service.runAction(999);

    expect(undo).not.toHaveBeenCalled();
  });
});
