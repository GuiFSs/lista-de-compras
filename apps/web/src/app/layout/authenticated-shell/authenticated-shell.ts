// AuthenticatedShell — layout das rotas autenticadas (guia, §3).
//
// App bar no topo (superfície + hairline, sem azul): título e ações vêm da
// rota ativa via `ShellChromeService`; o "Sair" é do shell e existe em toda
// rota autenticada. O conteúdo das rotas filhas renderiza no `<router-outlet>`
// e reserva a bottom nav fixa.
import { NgComponentOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionService } from '../../core/auth';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { ShellChromeService } from '../shell-chrome';

@Component({
  imports: [RouterOutlet, NgComponentOutlet, BottomNav],
  selector: 'app-authenticated-shell',
  templateUrl: './authenticated-shell.html',
  styleUrl: './authenticated-shell.scss',
})
export class AuthenticatedShell {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly chrome = inject(ShellChromeService);

  protected readonly title = this.chrome.title;
  protected readonly actions = this.chrome.actions;

  /** Logout manual (RN11/AC-13): encerra a sessão e volta ao login. */
  logout(): void {
    this.session.logout();
    void this.router.navigate(['/login']);
  }
}
