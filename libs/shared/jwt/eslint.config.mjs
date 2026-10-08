import baseConfig from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          // Ferramentas de teste (dev tooling) vivem no package.json da raiz
          // do workspace e não são dependências de runtime da lib: os specs
          // importam `vitest` e o `vitest.config.mts` usa `vite-tsconfig-paths`.
          // Declará-las em `dependencies` da lib induziria a pensar que o
          // consumidor final precisa delas — por isso são ignoradas aqui.
          ignoredDependencies: ['vitest', 'vite-tsconfig-paths'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];