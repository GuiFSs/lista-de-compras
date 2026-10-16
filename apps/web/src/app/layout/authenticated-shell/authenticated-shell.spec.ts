import { provideLocationMocks } from '@angular/common/testing';
import { Component, DestroyRef, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SESSION_STORAGE_KEY, SessionService } from '../../core/auth';
import { CartIcon } from '../../ui';
import { ShellChromeService } from '../shell-chrome';
import { AuthenticatedShell } from './authenticated-shell';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

/** Simula a rota ativa contribuindo título e ação ("Concluir compra"). */
@Component({ selector: 'app-chrome-contributor', template: '' })
class Contributor {
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);
  checkoutCount = 0;

  constructor() {
    this.chrome.contribute(
      {
        title: 'Compras da semana',
        actions: [
          {
            label: 'Concluir compra',
            icon: CartIcon,
            run: () => {
              this.checkoutCount += 1;
            },
          },
        ],
      },
      this.destroyRef,
    );
  }
}

describe('AuthenticatedShell', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AuthenticatedShell, Contributor],
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: '**', component: Blank },
        ]),
        provideLocationMocks(),
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  function mount(): ComponentFixture<AuthenticatedShell> {
    const fixture = TestBed.createComponent(AuthenticatedShell);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra o título padrão, a bottom nav e o "Sair" (AC-01)', () => {
    const native = mount().nativeElement as HTMLElement;

    expect(native.querySelector('.app-bar__title')?.textContent?.trim()).toBe(
      'Lista de compras',
    );
    expect(native.querySelector('app-bottom-nav')).not.toBeNull();
    expect(native.querySelector('nav')).not.toBeNull();
    expect(native.querySelector('.app-bar__logout')?.textContent?.trim()).toBe(
      'Sair',
    );
  });

  it('renderiza título e ação contribuídos pela rota, mantendo o "Sair"', async () => {
    const contributor = TestBed.createComponent(Contributor);
    const fixture = mount();
    await fixture.whenStable();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('.app-bar__title')?.textContent?.trim()).toBe(
      'Compras da semana',
    );

    const action = native.querySelector('.app-bar__action') as HTMLButtonElement;
    expect(action.getAttribute('aria-label')).toBe('Concluir compra');
    expect(action.querySelector('svg')).not.toBeNull();
    expect(native.querySelector('.app-bar__logout')).not.toBeNull();

    action.click();
    expect(contributor.componentInstance.checkoutCount).toBe(1);
  });

  it('encerra a sessão e volta ao login ao tocar em "Sair"', () => {
    const session = TestBed.inject(SessionService);
    session.login('token-de-teste');
    const native = mount().nativeElement as HTMLElement;

    (native.querySelector('.app-bar__logout') as HTMLButtonElement).click();

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
