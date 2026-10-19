// Bottom nav (guia §3/§5): as três abas da navegação principal, cada uma com
// rota real. Lista usa match exato; Histórico e Menor preço acompanham também
// os filhos (ex.: detalhe `/historico/:id` mantém a aba ativa).
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ClockIcon, ListIcon, TagIcon } from '../../ui';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, ListIcon, ClockIcon, TagIcon],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {}
