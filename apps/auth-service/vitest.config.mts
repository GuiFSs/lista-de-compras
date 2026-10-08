import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Root explícito: os padrões de testes e o setupFiles são resolvidos
  // a partir da pasta do serviço, não da raiz do monorepo.
  root: import.meta.dirname,
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Sem passWithNoTests (lição 4 do setup): o harness de DI abaixo é o
    // primeiro teste e prova que a suíte realmente executa.
  },
});