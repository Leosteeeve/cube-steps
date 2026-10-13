import { test, expect } from '@playwright/test';
test('method links and browser history preserve the scramble and clear the previous solution', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/solve');
  await page.getByLabel('Scramble sequence').fill('R U F2');
  await page.getByRole('button', { name: 'Explain with LBL' }).click();
  await expect(page.getByText('Verified LBL solution')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: /Beginner CFOP/ })
    .click();
  await expect(page).toHaveURL(/#\/solve\/cfop$/);
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  await expect(page.getByText('Verified LBL solution')).toHaveCount(0);
  await expect(page.locator('.solution-summary')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/solve$/);
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  await page.goForward();
  await expect(page).toHaveURL(/#\/solve\/cfop$/);
  await page.getByRole('button', { name: 'Explain with Beginner CFOP' }).click();
  await expect(page.getByText('Verified Beginner CFOP solution')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '02 First two layers', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile keyboard switching preserves painted stickers and undo history', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/solve');
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await page.getByRole('button', { name: 'Blue', exact: true }).click();
  await page.getByRole('button', { name: 'Front, row 1, column 1, unfilled' }).click();
  const cfop = page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: /Beginner CFOP/ });
  await cfop.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/solve\/cfop$/);
  await expect(page.getByRole('button', { name: 'Front, row 1, column 1, blue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explain with Beginner CFOP' })).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Front, row 1, column 1, unfilled' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/cfop-switch-${info.project.name}-mobile.png`,
    fullPage: true,
  });
});
