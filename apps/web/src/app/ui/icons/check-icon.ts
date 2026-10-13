import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-check',
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
    <path d="m20 6-11 11-5-5" />
  </svg>`,
  styleUrl: './icon.scss',
})
export class CheckIcon {}
