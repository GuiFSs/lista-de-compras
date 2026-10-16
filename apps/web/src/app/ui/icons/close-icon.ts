import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-close',
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
    <path d="m18 6-12 12" />
    <path d="m6 6 12 12" />
  </svg>`,
  styleUrl: './icon.scss',
})
export class CloseIcon {}
