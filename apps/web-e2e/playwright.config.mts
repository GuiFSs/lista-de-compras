import { defineConfig, devices } from '@playwright/test';

const workspaceRoot = process.cwd();

// URL do dev server do `apps/web` (@angular/build:dev-server, porta 4200).
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

export default defineConfig({
  testDir: './src',
  outputDir: '../../test-results/web-e2e',
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // A suíte sobe PWA e auth-service. Fluxos de UI interceptam o contrato HTTP
  // para permanecerem herméticos; seed/Postgres são validados separadamente
  // em T12 e nunca exigem credencial versionada.
  webServer: [
    {
      command: 'npx nx run web:serve',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
    {
      command: 'npx nx run auth-service:serve',
      port: 3001,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Outros navegadores ficam para quando houver necessidade (ADR 0004):
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
