import { Component, computed, input, output } from '@angular/core';
import type { ShoppingListItem } from '@lista/contracts';
import { CheckIcon, MoreIcon } from '../../ui';

/** Quantidade sem zeros à direita e com vírgula decimal (RN-06). */
function formatQuantity(value: number): string {
  return String(value).replace('.', ',');
}

/** Preço em R$ (moeda única — ADR 0002), sempre com centavos. */
function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Linha da lista (guia §5 "Listas"): alvo de marcar no lado do polegar,
 * nome + metadados e as ações secundárias fora da linha. O item vem do
 * serviço — a linha não reordena nem recalcula estado (RN-18).
 */
@Component({
  selector: 'app-item-row',
  imports: [CheckIcon, MoreIcon],
  templateUrl: './item-row.html',
  styleUrl: './item-row.scss',
})
export class ItemRow {
  readonly item = input.required<ShoppingListItem>();

  /**
   * Alvo de marcar/desmarcar (AC-12). Quem decide o que acontece — abrir o
   * sheet de compra ou desmarcar — é a tela (T-13).
   */
  readonly togglePurchased = output<ShoppingListItem>();

  /** Ações secundárias (editar/excluir) concentradas no sheet de T-14. */
  readonly openActions = output<ShoppingListItem>();

  protected readonly purchased = computed(() => this.item().purchased !== null);

  protected readonly toggleLabel = computed(() =>
    this.purchased()
      ? `Desmarcar ${this.item().name}`
      : `Marcar ${this.item().name} como comprado`,
  );

  protected readonly actionsLabel = computed(() => `Ações de ${this.item().name}`);

  /** Comprado mostra os dados da compra; pendente, os planejados (RN-03/RN-09). */
  protected readonly metadata = computed(() => {
    const item = this.item();
    const quantity = item.purchased?.quantity ?? item.plannedQuantity;
    const unit = item.purchased?.unit ?? item.unit;
    const price = item.purchased?.unitPrice ?? item.plannedPrice;

    const parts: string[] = [];
    if (quantity !== null) {
      parts.push(unit === null ? formatQuantity(quantity) : `${formatQuantity(quantity)} ${unit}`);
    }
    if (price !== null) parts.push(formatPrice(price));
    return parts.join(' · ');
  });
}
