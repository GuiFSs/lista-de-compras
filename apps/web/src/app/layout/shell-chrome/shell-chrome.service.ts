// App bar do shell autenticado: título e ações vêm da rota ativa; o "Sair" é
// do shell e nunca é contribuído (toda rota autenticada o mantém).
import { DestroyRef, Injectable, signal } from '@angular/core';
import { ShellAction, ShellChrome } from './shell-chrome.model';

/** Título padrão do shell (guia §3). */
export const DEFAULT_SHELL_TITLE = 'Lista de compras';

@Injectable({ providedIn: 'root' })
export class ShellChromeService {
  private readonly titleState = signal(DEFAULT_SHELL_TITLE);
  private readonly actionsState = signal<readonly ShellAction[]>([]);

  readonly title = this.titleState.asReadonly();
  readonly actions = this.actionsState.asReadonly();

  /**
   * Registra a contribuição da rota ativa. O `destroyRef` da própria rota
   * devolve o app bar ao default quando ela sai da tela.
   */
  contribute(chrome: ShellChrome, destroyRef: DestroyRef): void {
    this.titleState.set(chrome.title);
    this.actionsState.set(chrome.actions);
    destroyRef.onDestroy(() => this.reset());
  }

  reset(): void {
    this.titleState.set(DEFAULT_SHELL_TITLE);
    this.actionsState.set([]);
  }
}
