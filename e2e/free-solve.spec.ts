import { test, expect } from '@playwright/test';
test('reselecting a solution stage always returns to its beginning', async ({ page }) => {
  await page.goto('#/solve');
  await page.getByLabel('Scramble sequence').fill("R U2 F'");
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  const next = page.getByRole('button', { name: 'Next move', exact: true });
  await expect(next).toBeEnabled();
  const position = page.getByTestId('move-position');
  for (let repeat = 0; repeat < 2; repeat++) {
    await next.click();
    await expect(position).toContainText('Move 1 of');
    await page.getByRole('button', { name: '01 White cross', exact: true }).click();
    await expect(position).toContainText('Move 0 of');
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(position).not.toContainText('Move 0 of');
  await page.getByRole('button', { name: '01 White cross', exact: true }).click();
  await expect(position).toContainText('Move 0 of');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
test('solves pasted, random and empty inputs while preserving useful parse errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/solve');
  const input = page.getByLabel('Scramble sequence');
  await input.fill("R U2 F'");
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await input.fill('R M');
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('character 3');
  await expect(page.getByTestId('move-position')).toBeVisible();
  await input.fill('');
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByTestId('move-position')).toHaveText('Move 0 of 0');
  await page.getByRole('button', { name: 'Random scramble', exact: true }).click();
  await expect(input).not.toHaveValue('');
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
