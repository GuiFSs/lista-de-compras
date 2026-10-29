import { Component } from '@angular/core';

/** Cupom/nota fiscal — papel com linhas de item. */
@Component({
  selector: 'app-icon-receipt',
  template: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M6 2.75h12a1 1 0 0 1 1 1v16.7l-1.6-1-1.6 1-1.6-1-1.6 1-1.6-1-1.6 1-1.6-1-1.6 1V3.75a1 1 0 0 1 1-1Z"
    />
    <path d="M9 7h6" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </svg>`,
  styleUrl: './icon.scss',
})
export class ReceiptIcon {}
