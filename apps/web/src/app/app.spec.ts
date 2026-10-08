// Smoke do App (nova navegação, T10):
// a raiz virou só o `<router-outlet>` — sem sessão, a PWA redireciona para
// a tela de login (tela cheia, sem app-bar) — AC-01/AC-12.
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withDisabledInitialNavigation,
} from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(appRoutes, withDisabledInitialNavigation()),
        provideLocationMocks(),
      ],
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renderiza só o router-outlet (o shell saiu da raiz)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('.app-bar')).toBeNull();
  });

  it('sem sessão, a rota raiz redireciona para o login — tela cheia (AC-01/AC-12)', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/');
    await fixture.whenStable();

    expect(router.url).toBe('/login');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login')).toBeTruthy();
    expect(compiled.querySelector('.app-bar')).toBeNull();
  });
});