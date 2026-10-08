// Placeholder da rota `/login` — tela cheia, fora da navegação (AC1).
//
// A tela de login real (form, estados, AC3–AC6/AC11/AC14) é entregue na T11;
// este placeholder só existe para a rota resolver desde já (o guard
// anti-sessão e os smokes dependem dela). Nenhum link/rota de cadastro (AC9).
import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {}