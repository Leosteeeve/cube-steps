import { test, expect } from '@playwright/test';
test('club home and deep lesson reload preserve their entry and shared player', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/');
  await expect(page.getByRole('link', { name: 'Webb Cubing Club home' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'club');
  await page.goto('club/#/learn/white-cross');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Build the white cross', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/\/club\/#\/learn\/white-cross$/);
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'global');
  expect(errors).toEqual([]);
});
