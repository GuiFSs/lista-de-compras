import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-more',
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
    <circle cx="12" cy="5" r=".5" />
    <circle cx="12" cy="12" r=".5" />
    <circle cx="12" cy="19" r=".5" />
  </svg>`,
  styleUrl: './icon.scss',
})
export class MoreIcon {}
