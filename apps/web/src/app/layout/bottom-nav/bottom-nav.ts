// Bottom nav (guia §3/§5): as três abas da navegação principal. Só "Lista"
// tem destino nesta rodada; Histórico e Menor preço ficam desabilitadas com
// "em breve" e sem rota (CD-05).
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
