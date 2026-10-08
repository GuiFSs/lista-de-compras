// AuthenticatedShell — layout das rotas autenticadas (guia, §3).
//
// App bar no topo (superfície + hairline, sem azul): título/brand à esquerda
// e a ação de sair à direita (ghost, alvo ≥ 44px). O conteúdo das rotas
// filhas renderiza no `<router-outlet>`. Sem bottom nav nesta feature
// (PLAN.md — a navegação por abas entra com as features de Lista/Histórico).
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionService } from '../../core/auth';

@Component({
  imports: [RouterOutlet],
  selector: 'app-authenticated-shell',
  templateUrl: './authenticated-shell.html',
  styleUrl: './authenticated-shell.scss',
})
export class AuthenticatedShell {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** Logout manual (RN11/AC13): encerra a sessão e volta ao login. */
  logout(): void {
    this.session.logout();
    void this.router.navigate(['/login']);
  }
}