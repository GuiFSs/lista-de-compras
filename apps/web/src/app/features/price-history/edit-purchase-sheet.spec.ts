import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PurchaseDetailResponse, UpdatePurchaseRequest } from '@lista/contracts';
import { ToastService } from '../../ui';
import { EditPurchaseSheet } from './edit-purchase-sheet';
import { PriceHistoryStore } from './state';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function purchase(): PurchaseDetailResponse {
  return {
    id: 'c1',
    market: 'Mercado Central',
    purchaseDate: '2026-10-15',
    createdAt: '2026-10-15T12:00:00.000Z',
    items: [
      { name: 'Café', quantity: 2, unit: 'pacote', unitPrice: 7.5 },
      { name: 'Arroz', quantity: 1, unit: 'kg', unitPrice: 21.9 },
    ],
  };
}

class StoreStub {
  updatePurchase = vi.fn(
    (_id: string, _body: UpdatePurchaseRequest): Promise<PurchaseDetailResponse> =>
      Promise.resolve(purchase()),
  );
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = fixture.nativeElement.querySelector(selector) as T | null;
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
}

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  return button;
}

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input'));
  element.dispatchEvent(new Event('change'));
}

describe('EditPurchaseSheet', () => {
  let store: StoreStub;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [{ provide: PriceHistoryStore, useValue: store }],
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  function mount(): ComponentFixture<EditPurchaseSheet> {
    const fixture = TestBed.createComponent(EditPurchaseSheet);
    fixture.componentRef.setInput('purchase', purchase());
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  it('abre preenchido com mercado, data e os itens (AC-01)', () => {
    const fixture = mount();

    expect(query<HTMLInputElement>(fixture, '#edit-market').value).toBe('Mercado Central');
    expect(query<HTMLInputElement>(fixture, '#edit-date').value).toBe('2026-10-15');
    expect(query<HTMLInputElement>(fixture, '#edit-line-1-name').value).toBe('Café');
    expect(query<HTMLInputElement>(fixture, '#edit-line-1-qty').value).toBe('2');
    expect(query<HTMLSelectElement>(fixture, '#edit-line-1-unit').value).toBe('pacote');
    expect(query<HTMLInputElement>(fixture, '#edit-line-1-price').value).toBe('R$ 7,50');
    expect(query<HTMLInputElement>(fixture, '#edit-line-2-name').value).toBe('Arroz');
  });

  it('salvar envia a compra na ordem das linhas (AC-02/AC-03)', async () => {
    const fixture = mount();
    const toast = vi.spyOn(TestBed.inject(ToastService), 'show');

    setValue(query(fixture, '#edit-market'), '  Mercado Sul  ');
    buttonByText(fixture, 'Incluir item').click();
    fixture.detectChanges();

    const newKey = 3;
    setValue(query(fixture, `#edit-line-${newKey}-name`), 'Leite');
    setValue(query(fixture, `#edit-line-${newKey}-qty`), '1');
    setValue(query(fixture, `#edit-line-${newKey}-unit`), 'L');
    setValue(query(fixture, `#edit-line-${newKey}-price`), '450');
    buttonByText(fixture, 'Salvar').click();
    await flush();

    expect(store.updatePurchase).toHaveBeenCalledWith('c1', {
      market: 'Mercado Sul',
      purchaseDate: '2026-10-15',
      items: [
        { name: 'Café', quantity: 2, unit: 'pacote', unitPrice: 7.5 },
        { name: 'Arroz', quantity: 1, unit: 'kg', unitPrice: 21.9 },
        { name: 'Leite', quantity: 1, unit: 'L', unitPrice: 4.5 },
      ],
    });
    expect(toast).toHaveBeenCalledWith('Compra atualizada');
  });

  it('sem linhas o Salvar fica desabilitado e nada é enviado (AC-04)', () => {
    const fixture = mount();

    buttonByText(fixture, 'Remover item').click();
    fixture.detectChanges();
    buttonByText(fixture, 'Remover item').click();
    fixture.detectChanges();

    const save = buttonByText(fixture, 'Salvar');
    expect(save.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'A compra precisa ter pelo menos um item.',
    );
    save.click();
    expect(store.updatePurchase).not.toHaveBeenCalled();
  });

  it('nome repetido na compra não envia e mostra o conflito (AC-05)', async () => {
    const fixture = mount();

    setValue(query(fixture, '#edit-line-2-name'), 'cafe');
    buttonByText(fixture, 'Salvar').click();
    await flush();
    fixture.detectChanges();

    expect(store.updatePurchase).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Já existe um item com esse nome nesta compra',
    );
  });

  it('mercado vazio e data futura não enviam (AC-06)', async () => {
    const fixture = mount();

    setValue(query(fixture, '#edit-market'), '   ');
    buttonByText(fixture, 'Salvar').click();
    await flush();
    fixture.detectChanges();

    expect(store.updatePurchase).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Mercado é obrigatório');

    setValue(query(fixture, '#edit-market'), 'Feira');
    setValue(query(fixture, '#edit-date'), '2099-01-01');
    buttonByText(fixture, 'Salvar').click();
    await flush();
    fixture.detectChanges();

    expect(store.updatePurchase).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'A data da compra não pode ser futura',
    );
  });

  it('falha de rede preserva o que foi digitado (AC-10)', async () => {
    const fixture = mount();
    store.updatePurchase.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

    setValue(query(fixture, '#edit-market'), 'Feira do bairro');
    buttonByText(fixture, 'Salvar').click();
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Falha de rede. Verifique a conexão e tente novamente.',
    );
    expect(query<HTMLInputElement>(fixture, '#edit-market').value).toBe('Feira do bairro');
  });
});
