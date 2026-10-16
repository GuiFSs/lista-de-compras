import { Component, computed, input, output } from '@angular/core';
import type { ShoppingListItem } from '@lista/contracts';
import { BottomSheet } from '../../ui';

/**
 * Sheet de ações da linha (guia §5 "Listas"/"Sheets"): as ações secundárias
 * ficam fora da linha. O sheet não muda estado — emite a intenção e a tela
 * decide o fluxo: marcar reusa o sheet de compra (T-13), editar abre o
 * formulário e excluir entra na janela de "Desfazer" (T-14).
 */
@Component({
  selector: 'app-item-actions-sheet',
  imports: [BottomSheet],
  templateUrl: './item-actions-sheet.html',
  styleUrl: './item-actions-sheet.scss',
})
export class ItemActionsSheet {
  readonly item = input.required<ShoppingListItem>();

  readonly closed = output<void>();
  readonly togglePurchased = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();

  protected readonly purchased = computed(() => this.item().purchased !== null);

  protected readonly toggleLabel = computed(() =>
    this.purchased() ? 'Desmarcar como comprado' : 'Marcar como comprado',
  );
}
