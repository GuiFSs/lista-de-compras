import { Type } from '@angular/core';

/**
 * Ação de app bar contribuída pela rota ativa. O ícone é decorativo: o nome
 * acessível é o `label` (guia §3/§5).
 */
export interface ShellAction {
  label: string;
  icon: Type<unknown>;
  run: () => void;
}

/** Conteúdo do app bar que a rota ativa pode contribuir. */
export interface ShellChrome {
  title: string;
  actions: readonly ShellAction[];
}
