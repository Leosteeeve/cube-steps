import { test, expect } from '@playwright/test';
import { renderNotationFrame } from './helpers/notation';
test('built welcome, hands-on Moves and safe Timer tours work without changing editions', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/');
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await page.getByRole('button', { name: 'Skip step' }).click();
  await page.getByRole('button', { name: 'Exit tour' }).click();
  await page.goto('club/#/guide/moves');
  await page.getByRole('button', { name: 'Start Moves tour', exact: true }).click();
  const next = page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true });
  await next.click();
  await page.getByRole('button', { name: 'U, Up face', exact: true }).click();
  await next.click();
  await page.getByRole('button', { name: /^U prime,/ }).click();
  await next.click();
  await renderNotationFrame(page);
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  await expect(next).toBeEnabled();
  await page.getByRole('button', { name: 'Exit tour' }).click();
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toHaveAttribute('data-phase', 'idle', { timeout: 25000 });
  const scramble = await page.locator('.timer-scramble-text').innerText();
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('.timer-scramble-text')).toHaveText(scramble);
  await expect(page.getByText('0 solves', { exact: true })).toBeVisible();
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Page tour' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Guide', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('built Guide loads no engine, enlarges real screenshots, and survives image failure', async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  // Vite puts its small preload helper in cubing~global~club; it contains no
  // puzzle engine. Block actual engine chunks without blocking app startup.
  await page.route(
    /\/assets\/(?:cube-|registry-|cubing~(?!global~club-)|solve\.worker|practice\.worker)/,
    (r) => r.abort(),
  );
  await page.goto('club/#/guide');
  await expect(page.locator('.guide-chapter')).toHaveCount(10);
  await expect(page.locator('#guide-lab')).toBeVisible();
  await expect(page.locator('#guide-roux')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open Beginner Roux →', exact: true }),
  ).toHaveAttribute('href', '#/learn/roux/intro');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const button = page.getByRole('button', { name: /^Enlarge:/ }).first();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close image' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await page.route('**/club-guide/*.png', (r) => r.abort());
  await page.reload();
  // Lazy images need to approach the viewport before WebKit requests them.
  // Do not depend on its preload distance or reload scroll restoration.
  await page.locator('.guide-image').first().scrollIntoViewIfNeeded();
  await expect(page.getByText(/Screenshot unavailable/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Home →', exact: true })).toBeVisible();
  expect(
    requests.filter((u) =>
      /\/assets\/(?:cube-|registry-|cubing~(?!global~club-)|solve\.worker|practice\.worker)/.test(
        u,
      ),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
