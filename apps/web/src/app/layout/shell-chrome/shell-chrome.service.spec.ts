import { Component, DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartIcon } from '../../ui';
import { ShellAction } from './shell-chrome.model';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from './shell-chrome.service';

const CHECKOUT: ShellAction = {
  label: 'Concluir compra',
  icon: CartIcon,
  run: () => undefined,
};

@Component({ selector: 'app-chrome-contributor', template: '' })
class Contributor {
  private readonly chrome = inject(ShellChromeService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.chrome.contribute(
      { title: 'Lista de compras', actions: [CHECKOUT] },
      this.destroyRef,
    );
  }
}

@Component({ selector: 'app-empty-shell', template: '' })
class EmptyShell {
  readonly chrome = inject(ShellChromeService);
}

describe('ShellChromeService', () => {
  let service: ShellChromeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Contributor, EmptyShell] });
    service = TestBed.inject(ShellChromeService);
  });

  it('começa com o título padrão e sem ações', () => {
    expect(service.title()).toBe(DEFAULT_SHELL_TITLE);
    expect(service.actions()).toEqual([]);
  });

  it('aplica título e ações da rota que contribui', () => {
    TestBed.createComponent(Contributor);

    expect(service.title()).toBe('Lista de compras');
    expect(service.actions()).toEqual([CHECKOUT]);
  });

  it('volta ao default quando a rota que contribuiu sai da tela', () => {
    const fixture = TestBed.createComponent(Contributor);

    fixture.destroy();

    expect(service.title()).toBe(DEFAULT_SHELL_TITLE);
    expect(service.actions()).toEqual([]);
  });

  it('reset() limpa a contribuição anterior', () => {
    const fixture = TestBed.createComponent(Contributor);

    service.reset();

    expect(service.title()).toBe(DEFAULT_SHELL_TITLE);
    expect(service.actions()).toEqual([]);
    fixture.destroy();
  });

  it('mantém o título padrão quando a rota não contribui', () => {
    TestBed.createComponent(EmptyShell);

    expect(service.title()).toBe(DEFAULT_SHELL_TITLE);
    expect(service.actions()).toEqual([]);
  });
});
