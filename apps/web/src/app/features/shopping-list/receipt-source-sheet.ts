import { Component, output } from '@angular/core';
import { BottomSheet } from '../../ui';

export type ReceiptImageSource = 'camera' | 'gallery';

/**
 * Escolha da origem da foto da nota: câmera ou galeria (antes do file input).
 */
@Component({
  selector: 'app-receipt-source-sheet',
  imports: [BottomSheet],
  templateUrl: './receipt-source-sheet.html',
  styleUrl: './receipt-source-sheet.scss',
})
export class ReceiptSourceSheet {
  readonly closed = output<void>();
  readonly chosen = output<ReceiptImageSource>();

  protected cancel(): void {
    this.closed.emit();
  }

  protected chooseCamera(): void {
    this.chosen.emit('camera');
  }

  protected chooseGallery(): void {
    this.chosen.emit('gallery');
  }
}
