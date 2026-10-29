import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Root explícito: os padrões de testes e o setupFiles são resolvidos
  // a partir da pasta do serviço, não da raiz do monorepo.
  root: import.meta.dirname,
  plugins: [tsconfigPaths()],
  resolve: {
    // Alias explícito: o plugin de paths às vezes não resolve o monorepo
    // a partir do root do serviço (mesmo padrão já usado para jwt).
    alias: {
      '@lista/contracts': fileURLToPath(
        new URL('../../libs/contracts/src/index.ts', import.meta.url),
      ),
      '@lista/shared/jwt/testing': fileURLToPath(
        new URL(
          '../../libs/shared/jwt/src/test-fixtures/index.ts',
          import.meta.url,
        ),
      ),
      '@lista/shared/jwt': fileURLToPath(
        new URL('../../libs/shared/jwt/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Sem passWithNoTests (docs/lessons/2026-10-07-setup-inicial.md, "Padrões
    // gerais" §2): verde sem execução é pior que vermelho — uma suíte que não
    // roda nenhum teste deve falhar.
  },
});
