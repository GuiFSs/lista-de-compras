import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BottomNav } from './bottom-nav';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

function tabButtons(fixture: ComponentFixture<BottomNav>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('button.bottom-nav__tab'),
  ) as HTMLButtonElement[];
}

describe('BottomNav', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [
        provideRouter([
          { path: '', component: Blank },
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
    const list = fixture.nativeElement.querySelector(
      'a.bottom-nav__tab',
    ) as HTMLAnchorElement;

    expect(list.getAttribute('href')).toBe('/');
    expect(list.classList.contains('bottom-nav__tab--active')).toBe(true);
    expect(list.getAttribute('aria-current')).toBe('page');
  });

  it('não marca Lista como ativa fora da rota da lista', async () => {
    const fixture = await mountAt('/compras/2026');
    const list = fixture.nativeElement.querySelector(
      'a.bottom-nav__tab',
    ) as HTMLAnchorElement;

    expect(list.classList.contains('bottom-nav__tab--active')).toBe(false);
    expect(list.getAttribute('aria-current')).toBeNull();
  });

  it('Histórico e Menor preço ficam desabilitadas, com "em breve" e sem rota (AC-01)', async () => {
    const fixture = await mountAt('/');
    const [history, lowestPrice] = tabButtons(fixture);

    expect(history.disabled).toBe(true);
    expect(history.textContent).toContain('Histórico');
    expect(history.textContent).toContain('em breve');
    expect(lowestPrice.disabled).toBe(true);
    expect(lowestPrice.textContent).toContain('Menor preço');
    expect(lowestPrice.textContent).toContain('em breve');
  });

  it('tocar nas abas desabilitadas não navega (AC-01)', async () => {
    const fixture = await mountAt('/');
    const router = TestBed.inject(Router);
    const url = router.url;

    tabButtons(fixture).forEach((tab) => tab.click());
    await fixture.whenStable();

    expect(router.url).toBe(url);
  });
});
