import { ITEM_UNITS } from '@lista/contracts';
import type { ItemUnit } from '@lista/contracts';

/**
 * Guard para unidades vindas do evento de conclusão (RN-05). As sete unidades
 * vivem em `@lista/contracts` (T-02) para serviço e PWA não divergirem.
 */
export function isItemUnit(value: unknown): value is ItemUnit {
  return (
    typeof value === 'string' &&
    (ITEM_UNITS as readonly string[]).includes(value)
  );
}
