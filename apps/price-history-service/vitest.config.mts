import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [tsconfigPaths()],
  resolve: {
    // Alias explícito: o plugin de paths às vezes não resolve o monorepo
    // a partir do root do serviço (mesmo padrão do shopping-list-service).
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
  },
});
