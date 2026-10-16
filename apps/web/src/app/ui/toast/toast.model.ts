export type ToastVariant = 'success' | 'error';

/** Ação opcional do toast — ex.: "Desfazer" no toast de item excluído (AC-11). */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}
