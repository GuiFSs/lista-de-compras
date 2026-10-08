import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Root explícito: os padrões de testes são resolvidos a partir da pasta
  // da lib, não da raiz do monorepo.
  root: import.meta.dirname,
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Sem passWithNoTests (lição 4 do setup): a suíte desta lib tem testes
    // reais e provam que ela executa.
  },
});