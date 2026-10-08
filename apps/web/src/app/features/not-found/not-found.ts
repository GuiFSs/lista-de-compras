// Placeholder autenticado para rotas desconhecidas (filho `**` do shell).
//
// A `**` dentro do shell garante que QUALQUER rota/deep link com sessão
// renderize dentro do layout autenticado (AC12) em vez de quebrar; sem
// sessão, o `authGuard` do pai captura a URL antes e a preserva no
// `returnUrl`.
import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}