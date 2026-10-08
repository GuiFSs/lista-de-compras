import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Root explícito: os padrões de testes e o setupFiles são resolvidos
  // a partir da pasta do serviço, não da raiz do monorepo.
  root: import.meta.dirname,
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
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
    passWithNoTests: true,
  },
});
