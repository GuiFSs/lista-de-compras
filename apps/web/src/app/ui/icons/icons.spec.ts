import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CartIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  ListIcon,
  MoreIcon,
  ReceiptIcon,
  TagIcon,
} from './index';

const ICONS: ReadonlyArray<{ name: string; icon: Type<unknown> }> = [
  { name: 'close', icon: CloseIcon },
  { name: 'check', icon: CheckIcon },
  { name: 'list', icon: ListIcon },
  { name: 'clock', icon: ClockIcon },
  { name: 'tag', icon: TagIcon },
  { name: 'cart', icon: CartIcon },
  { name: 'more', icon: MoreIcon },
  { name: 'receipt', icon: ReceiptIcon },
];

describe('Ícones inline', () => {
  for (const { name, icon } of ICONS) {
    it(`${name}: SVG decorativo que herda a cor do contexto`, async () => {
      const fixture = TestBed.createComponent(icon);
      await fixture.whenStable();

      const svg = fixture.nativeElement.querySelector('svg') as SVGElement | null;

      expect(svg).not.toBeNull();
      // Decorativo: o nome acessível é do botão (aria-label), nunca do desenho.
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.getAttribute('focusable')).toBe('false');
      expect(svg?.getAttribute('stroke')).toBe('currentColor');
      expect(svg?.textContent?.trim()).toBe('');
    });
  }

  it('não polui o nome acessível do botão que o envolve', async () => {
    const fixture = TestBed.createComponent(CloseIcon);
    await fixture.whenStable();

    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Fechar');
    button.appendChild(fixture.nativeElement);
    document.body.appendChild(button);

    expect(button.getAttribute('aria-label')).toBe('Fechar');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    button.remove();
  });
});
