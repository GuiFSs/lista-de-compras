// Placeholder navegável de `/historico` (T-16): mantém rota, app bar e aba
// coerentes até a T-18 entregar a tela real com lista e estados.
import { Component, DestroyRef, inject } from '@angular/core';
import { ShellChromeService } from '../../layout/shell-chrome';

@Component({
  selector: 'app-history-page',
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage {
  constructor() {
    inject(ShellChromeService).contribute(
      { title: 'Histórico', actions: [] },
      inject(DestroyRef),
    );
  }
}
