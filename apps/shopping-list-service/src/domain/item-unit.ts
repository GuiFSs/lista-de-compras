import { ITEM_UNITS } from '@lista/contracts';
import type { ItemUnit } from '@lista/contracts';

/**
 * Guard para valores vindos da borda HTTP ou do banco (RN-05/AC-06). As sete
 * unidades vivem em `@lista/contracts` (T-02) para serviço e PWA não divergirem.
 */
export function isItemUnit(value: unknown): value is ItemUnit {
  return (
    typeof value === 'string' &&
    (ITEM_UNITS as readonly string[]).includes(value)
  );
}
