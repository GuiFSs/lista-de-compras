import { test, expect } from '@playwright/test';

const loginUrl = '**/api/auth/login';

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

test('sem sessão, a PWA carrega e redireciona para o login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Lista de Compras');
  await page.waitForURL('**/login');
  await expect(page.locator('app-root')).toBeVisible();
  // Login é tela cheia, fora da navegação (AC-01): sem app-bar nem bottom nav.
  await expect(page.locator('.app-bar')).toHaveCount(0);
  // Receita auth §4: marca display + subtítulo antes do form.
  await expect(
    page.getByRole('heading', { name: 'Lista de Compras', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('Entre para ver a lista')).toBeVisible();
});

test('campos vazios não enviam login (AC-06)', async ({ page }) => {
  let requests = 0;
  await page.route(loginUrl, async (route) => {
    requests += 1;
    await route.abort();
  });
  await page.goto('/login');

  await page.getByRole('button', { name: 'Entrar' }).click();

  expect(requests).toBe(0);
  await expect(page).toHaveURL(/\/login$/);
});

test('duplo toque gera uma requisição e mostra progresso (AC-04)', async ({
  page,
}) => {
  let requests = 0;
  await page.route(loginUrl, async (route) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 401,
        message: 'Credenciais inválidas',
      }),
    });
  });
  await page.goto('/login');
  await page.getByLabel('Usuário').fill('lista');
  await page.getByLabel('Senha').fill('incorreta');

  const submit = page.getByRole('button', { name: 'Entrar' });
  await submit.click();
  await submit.click({ force: true });

  await expect(
    page.getByRole('button', { name: 'Entrando…' }),
  ).toBeDisabled();
  await expect(page.getByRole('alert').first()).toContainText(
    'Credenciais inválidas',
  );
  expect(requests).toBe(1);
});

test('erro de rede preserva os campos e permite tentar novamente (AC-05)', async ({
  page,
}) => {
  await page.route(loginUrl, (route) => route.abort('failed'));
  await page.goto('/login');
  await page.getByLabel('Usuário').fill('lista');
  await page.getByLabel('Senha').fill('senha-local');

  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert').first()).toContainText('Erro de rede');
  await expect(page.getByLabel('Usuário')).toHaveValue('lista');
  await expect(page.getByLabel('Senha')).toHaveValue('senha-local');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
});

test('login guarda a sessão, retorna ao deep link e logout encerra (AC-02, AC-12, AC-13)', async ({
  page,
}) => {
  const token = fakeJwt();
  await page.route(loginUrl, (route) =>
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

  await page.goto('/compras/2026');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page.getByLabel('Usuário').fill('lista');
  await page.getByLabel('Senha').fill('senha-local');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/compras\/2026$/);
  expect(
    await page.evaluate(() => localStorage.getItem('lcd.accessToken')),
  ).toBe(token);

  await page.reload();
  await expect(page).toHaveURL(/\/compras\/2026$/);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem('lcd.accessToken')),
  ).toBeNull();
});

test('429 é visível e a tela respeita viewport mobile e tema (AC-11, AC-14)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.route(loginUrl, (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 429,
        message: 'Muitas tentativas de login. Aguarde e tente novamente.',
      }),
    }),
  );
  await page.goto('/login');
  await page.getByLabel('Usuário').fill('lista');
  await page.getByLabel('Senha').fill('incorreta');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert').first()).toContainText(
    'Muitas tentativas',
  );
  const button = page.getByRole('button', { name: 'Entrar' });
  await expect(button).toBeVisible();
  expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.login-form')).toBeVisible();
});