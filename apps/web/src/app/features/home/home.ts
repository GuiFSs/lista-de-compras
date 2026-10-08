// Home placeholder (AC-13) — rota filha `''` do shell autenticado.
//
// Simples e mobile-first, sem bottom nav nesta feature (PLAN.md): a home
// real entra com a feature de Lista. Estado vazio explícito do guia (§4).
import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}