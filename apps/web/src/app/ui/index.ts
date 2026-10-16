// Primitivas de UI da PWA (guia §5). Ficam em `apps/web` — e não em
// `libs/ui-web` — enquanto o único consumidor é a própria PWA.
export { BottomSheet } from './bottom-sheet/bottom-sheet';
export * from './icons';
export { TOAST_CONFIRMATION_TIMEOUT_MS, ToastHost, ToastService } from './toast';
export type { Toast, ToastAction, ToastVariant } from './toast';
