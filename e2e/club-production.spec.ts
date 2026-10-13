import { expect, test } from '@playwright/test';
test('production club deep links, motion preferences and global identity remain independent', async ({
  page,
}) => {
  const errors: string[] = [],
    bad: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  await page.goto('club/');
  await expect(page.getByRole('link', { name: 'Find my starting point' })).toBeVisible();
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(favicon).toBeTruthy();
  expect((await page.request.get(new URL(favicon!, page.url()).href)).ok()).toBe(true);
  await page.goto('club/#/learn/white-cross');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByLabel('Current holding')).toContainText('yellow up');
  const before = await page.getByTestId('move-position').textContent();
  const holding = await page.getByLabel('Current holding').textContent();
  const select = page.getByLabel('Decorative motion');
  await select.focus();
  await select.selectOption('off');
  await expect(select).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.getByTestId('move-position')).toHaveText(before!);
  await expect(page.getByLabel('Current holding')).toHaveText(holding!);
  await page.reload();
  await expect(select).toHaveValue('off');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await select.selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./#/learn/notation');
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'global');
  await expect(page.getByLabel('Decorative motion')).toHaveValue('system');
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
