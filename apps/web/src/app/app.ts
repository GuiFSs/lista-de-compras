// App é só o ponto de montagem do roteador (AC-01):
// - sem sessão → `/login` (tela cheia, sem app-bar);
// - com sessão → `AuthenticatedShell` (app-bar + logout) renderiza o resto.
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}