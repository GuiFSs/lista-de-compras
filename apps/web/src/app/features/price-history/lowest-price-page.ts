// Placeholder navegável de `/menor-preco` (T-16): mantém rota, app bar e aba
// até a T-19 entregar a tela real com busca e estados.
import { Component, DestroyRef, inject } from '@angular/core';
import { ShellChromeService } from '../../layout/shell-chrome';

@Component({
  selector: 'app-lowest-price-page',
  templateUrl: './lowest-price-page.html',
  styleUrl: './lowest-price-page.scss',
})
export class LowestPricePage {
  constructor() {
    inject(ShellChromeService).contribute(
      { title: 'Menor preço', actions: [] },
      inject(DestroyRef),
    );
  }
}
