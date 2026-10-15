import { test, expect } from '@playwright/test';
test('Lab Guide works without solver assets and a missing screenshot keeps written help', async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/core\/cube\.|\/src\/lab\/|lab\.worker|execution\/profiles/, (r) => {
    requests.push(r.request().url());
    return r.abort();
  });
  await page.route('**/club-guide/lab-analyze.png', (r) => r.abort());
  await page.goto('club/#/guide/lab');
  await expect(page.getByRole('heading', { name: 'Explore CFOP Lab' })).toBeFocused();
  await expect(page.getByRole('link', { name: /Open CFOP Lab/ })).toHaveAttribute('href', '#/lab');
  await expect(page.getByText(/Screenshot unavailable/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
test('Lab tour explains all five live targets without analyzing or changing input', async ({
  page,
}) => {
  const searches: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (/lab\.worker|execution\/profiles|distance-v1/.test(r.url())) searches.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('club/#/guide/lab');
  await page.getByRole('button', { name: 'Start CFOP Lab tour', exact: true }).click();
  for (const [i, title] of [
    'Bring a familiar cube',
    'Choose your bottom colors',
    'Let the search improve',
    'Read the tradeoff',
    'Compare, then try',
  ].entries()) {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: title })).toBeVisible();
    await expect(dialog).toContainText('Read, then continue at your pace.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dialog
      .getByRole('button', { name: i === 4 ? 'Finish tour' : 'Next', exact: true })
      .click();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Ready to explore', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('');
  expect(searches).toEqual([]);
  expect(errors).toEqual([]);
});
