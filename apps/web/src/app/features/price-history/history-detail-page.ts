// Placeholder navegável de `/historico/:id` (T-16): mantém rota, app bar e aba
// do Histórico até a T-18 entregar o detalhe real.
import { Component, DestroyRef, inject } from '@angular/core';
import { ShellChromeService } from '../../layout/shell-chrome';

@Component({
  selector: 'app-history-detail-page',
  templateUrl: './history-detail-page.html',
  styleUrl: './history-detail-page.scss',
})
export class HistoryDetailPage {
  constructor() {
    inject(ShellChromeService).contribute(
      { title: 'Detalhe da compra', actions: [] },
      inject(DestroyRef),
    );
  }
}
