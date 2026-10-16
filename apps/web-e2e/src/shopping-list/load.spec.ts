import { expect, test } from '@playwright/test';
import { openShoppingList } from '../support/shopping-list-journey';
import {
  MIN_TOUCH_TARGET,
  boxHeight,
  boxWidth,
  hasHorizontalOverflow,
  hasVisibleFocusRing,
  listRows,
  tapCenter,
  tokenValue,
} from '../support/ui';

test.describe('Lista — carga, estados e design', () => {
  test('abre na Lista: app bar com título, coluna única e bottom nav com Lista ativa e Histórico/Menor preço desabilitadas que não navegam', async ({
    page,
  }) => {
    await openShoppingList(page);

    await expect(page.locator('.app-bar')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lista de compras' })).toBeVisible();
    // "Sair" é do shell e sobrevive à troca de rota (regressão do auth).
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    // Conteúdo em coluna única: um só contêiner.
    await expect(page.locator('main.container')).toHaveCount(1);

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Lista' })).toHaveAttribute('aria-current', 'page');

    const history = nav.getByRole('button', { name: /Histórico/ });
    const cheapest = nav.getByRole('button', { name: /Menor preço/ });
    await expect(history).toBeDisabled();
    await expect(cheapest).toBeDisabled();
    await expect(nav.getByText('em breve')).toHaveCount(2);

    // Abas desabilitadas não navegam: toque real nas coordenadas dos alvos.
    await tapCenter(page, history);
    await tapCenter(page, cheapest);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Lista de compras' })).toBeVisible();
  });

  test('primeira carga mostra skeleton na forma da lista (sem spinner) e depois a lista', async ({
    page,
  }) => {
    await openShoppingList(page, { delayMs: 1500 });

    // `role="status"` não recebe nome acessível do conteúdo: o alvo é a forma
    // do skeleton, com o texto de carregamento só para leitor de tela.
    const skeleton = page.locator('.list-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('role', 'status');
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // Forma do conteúdo: uma linha de skeleton por linha da lista.
    await expect(skeleton.locator('.list-skeleton__row')).toHaveCount(4);
    expect(await boxHeight(skeleton.locator('.list-skeleton__target').first())).toBe(
      MIN_TOUCH_TARGET,
    );
    await expect(page.locator('.spinner')).toHaveCount(0);

    await expect(page.getByText('Sua lista está vazia')).toBeVisible();
    await expect(page.locator('.list-skeleton')).toHaveCount(0);
  });

  test('lista vazia mostra empty state com CTA primary Adicionar item', async ({ page }) => {
    await openShoppingList(page);

    await expect(page.getByText('Sua lista está vazia')).toBeVisible();
    await expect(
      page.getByText('Adicione o primeiro item e leve a lista para o mercado.'),
    ).toBeVisible();

    const cta = page.getByRole('button', { name: 'Adicionar item' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveClass(/btn-primary/);
    expect(await boxHeight(cta)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);

    // O CTA abre o formulário de adicionar (não é só ilustração).
    await cta.click();
    await expect(page.getByRole('heading', { name: 'Adicionar item' })).toBeVisible();
  });

  test('com pendentes e comprados, os pendentes aparecem primeiro', async ({ page }) => {
    // O comprado foi criado antes: a ordem vem do serviço (RN-18) e a tela não
    // reordena — pendentes primeiro.
    await openShoppingList(page, {
      seeds: [
        {
          name: 'Café',
          plannedQuantity: 1,
          unit: 'kg',
          purchased: { quantity: 1, unit: 'kg', unitPrice: 30 },
        },
        { name: 'Arroz', plannedQuantity: 2, unit: 'unidade' },
      ],
    });

    const rows = listRows(page);
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Arroz');
    await expect(rows.nth(1)).toContainText('Café');
    await expect(rows.nth(1).locator('.item-row__name')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    );
    await expect(page.getByText('1 pendente · 1 comprado')).toBeVisible();
  });

  test('falha ao carregar: erro visível na área + Tentar novamente recarrega e exibe a lista', async ({
    page,
  }) => {
    const api = await openShoppingList(page, { seeds: [{ name: 'Arroz' }] });
    await expect(listRows(page)).toHaveCount(1);

    api.setLoadFailure(true);
    await page.reload();

    const errorArea = page.getByRole('alert');
    await expect(errorArea).toContainText('Não foi possível carregar a lista');
    await expect(errorArea).toContainText('Falha de rede');
    await expect(listRows(page)).toHaveCount(0);

    api.setLoadFailure(false);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(listRows(page)).toHaveCount(1);
    await expect(listRows(page)).toContainText('Arroz');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('viewport 360px e desktop (`--container-max`), tema claro e escuro, uma única primary, alvos ≥44px, `:focus-visible` visível', async ({
    page,
  }) => {
    await openShoppingList(page, {
      seeds: [{ name: 'Arroz', plannedQuantity: 2, unit: 'unidade' }],
    });

    // Mobile 360px: utilizável, sem overflow horizontal.
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(listRows(page)).toHaveCount(1);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await boxWidth(page.locator('main.container'))).toBeLessThanOrEqual(360);

    // Uma única ação primary visível (guia §5).
    await expect(page.locator('.btn-primary:visible')).toHaveCount(1);

    // Alvos de toque ≥44px (linha, ações do item e CTA).
    expect(await boxHeight(page.getByRole('button', { name: 'Marcar Arroz como comprado' }))).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    expect(await boxHeight(page.getByRole('button', { name: 'Ações de Arroz' }))).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    expect(await boxHeight(page.getByRole('button', { name: 'Adicionar item' }))).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );

    // Tema claro pelos tokens (nada de valor hardcoded no teste).
    expect(await tokenValue(page, '--color-canvas')).toBe('#f6f5f4');
    expect(await tokenValue(page, '--touch-target-min')).toBe('44px');

    // Foco visível no caminho de teclado.
    await page.keyboard.press('Tab');
    expect(await hasVisibleFocusRing(page)).toBe(true);

    // Desktop: coluna única centralizada em `--container-max`.
    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await tokenValue(page, '--container-max')).toBe('960px');
    expect(await boxWidth(page.locator('main.container'))).toBe(960);
    await expect(page.locator('.btn-primary:visible')).toHaveCount(1);

    // Tema escuro funcional (tokens escuros aplicados pelo sistema).
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.getByRole('heading', { name: 'Lista de compras' })).toBeVisible();
    expect(await tokenValue(page, '--color-canvas')).toBe('#191919');
    expect(await tokenValue(page, '--color-primary-text')).toBe('#62aef0');
  });
});
