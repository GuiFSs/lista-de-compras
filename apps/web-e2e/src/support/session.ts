import type { Page } from '@playwright/test';

const AUTH_URL = '**/api/auth/login';

/** Gera um JWT RS256 falso (mesmo padrão do E2E de auth). */
function fakeJwt(expiresInSeconds = 86400): string {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    sub: 'e2e-user',
    iss: 'auth-service',
    iat: now,
    exp: now + expiresInSeconds,
  })}.assinatura-e2e`;
}

/** Prepara a página autenticada com sessão local válida. */
export async function login(page: Page): Promise<void> {
  const token = fakeJwt();
  await page.route(AUTH_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn: 86400,
      }),
    }),
  );

  await page.goto('/login');
  await page.getByLabel('Usuário').fill('lista');
  await page.getByLabel('Senha').fill('senha-local');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL('**/');
  await page.evaluate((t) => localStorage.setItem('lcd.accessToken', t), token);
}
