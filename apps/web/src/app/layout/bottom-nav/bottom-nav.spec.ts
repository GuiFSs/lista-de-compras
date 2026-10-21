import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BottomNav } from './bottom-nav';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

function tabs(fixture: ComponentFixture<BottomNav>): HTMLAnchorElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('a.bottom-nav__tab'),
  ) as HTMLAnchorElement[];
}

function tabByLabel(
  fixture: ComponentFixture<BottomNav>,
  label: string,
): HTMLAnchorElement {
  const tab = tabs(fixture).find((anchor) =>
    anchor.textContent?.includes(label),
  );
  if (tab === undefined) throw new Error(`Aba "${label}" não encontrada`);
  return tab;
}

describe('BottomNav', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'historico', component: Blank },
          { path: 'historico/:id', component: Blank },
          { path: 'menor-preco', component: Blank },
          { path: 'menor-preco/:item', component: Blank },
          { path: '**', component: Blank },
        ]),
        provideLocationMocks(),
      ],
    });
  });

  async function mountAt(path: string): Promise<ComponentFixture<BottomNav>> {
    const fixture = TestBed.createComponent(BottomNav);
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();
    return fixture;
  }

  it('é um marco de navegação com as três abas', async () => {
    const fixture = await mountAt('/');
    const native = fixture.nativeElement as HTMLElement;
    const landmark = native.querySelector('nav');

    expect(landmark?.getAttribute('aria-label')).toBe('Navegação principal');
    expect(native.querySelectorAll('.bottom-nav__tab')).toHaveLength(3);
    expect(landmark?.textContent).toContain('Lista');
    expect(landmark?.textContent).toContain('Histórico');
    expect(landmark?.textContent).toContain('Menor preço');
  });

  it('marca a aba Lista como ativa na rota da lista (AC-01)', async () => {
    const fixture = await mountAt('/');
    const list = tabByLabel(fixture, 'Lista');

    expect(list.getAttribute('href')).toBe('/');
    expect(list.classList.contains('bottom-nav__tab--active')).toBe(true);
    expect(list.getAttribute('aria-current')).toBe('page');
  });

  it('não marca Lista como ativa fora da rota da lista', async () => {
    const fixture = await mountAt('/compras/2026');
    const list = tabByLabel(fixture, 'Lista');

    expect(list.classList.contains('bottom-nav__tab--active')).toBe(false);
    expect(list.getAttribute('aria-current')).toBeNull();
  });

  it('tocar em Histórico navega para /historico e ativa a aba (AC-01)', async () => {
    const fixture = await mountAt('/');
    const router = TestBed.inject(Router);
    const history = tabByLabel(fixture, 'Histórico');
    expect(history.getAttribute('href')).toBe('/historico');

    history.click();
    await fixture.whenStable();

    expect(router.url).toBe('/historico');
    expect(history.classList.contains('bottom-nav__tab--active')).toBe(true);
    expect(history.getAttribute('aria-current')).toBe('page');
  });

  it('tocar em Menor preço navega para /menor-preco e ativa a aba (AC-02)', async () => {
    const fixture = await mountAt('/');
    const router = TestBed.inject(Router);
    const lowestPrice = tabByLabel(fixture, 'Menor preço');
    expect(lowestPrice.getAttribute('href')).toBe('/menor-preco');

    lowestPrice.click();
    await fixture.whenStable();

    expect(router.url).toBe('/menor-preco');
    expect(lowestPrice.classList.contains('bottom-nav__tab--active')).toBe(true);
    expect(lowestPrice.getAttribute('aria-current')).toBe('page');
  });

  it('mantém a aba Menor preço ativa no drill-down /menor-preco/:item (AC-05)', async () => {
    const fixture = await mountAt('/menor-preco/cafe');
    const lowestPrice = tabByLabel(fixture, 'Menor preço');

    expect(lowestPrice.classList.contains('bottom-nav__tab--active')).toBe(true);
    expect(lowestPrice.getAttribute('aria-current')).toBe('page');
    expect(
      tabByLabel(fixture, 'Lista').classList.contains('bottom-nav__tab--active'),
    ).toBe(false);
  });

  it('mantém a aba Histórico ativa no detalhe /historico/:id', async () => {
    const fixture = await mountAt('/historico/42');

    expect(tabByLabel(fixture, 'Histórico').classList.contains('bottom-nav__tab--active')).toBe(
      true,
    );
    expect(tabByLabel(fixture, 'Lista').classList.contains('bottom-nav__tab--active')).toBe(
      false,
    );
  });

  it('nenhuma aba vem desabilitada nem exibe "em breve" (AC-01/AC-02)', async () => {
    const fixture = await mountAt('/');
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelectorAll('button')).toHaveLength(0);
    expect(native.textContent).not.toContain('em breve');
    tabs(fixture).forEach((tab) => expect(tab.hasAttribute('disabled')).toBe(false));
  });
});
