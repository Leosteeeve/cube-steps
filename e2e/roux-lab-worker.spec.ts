import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('Roux analysis stop keeps complete verified routes; editing cancels stale work', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/roux-lab');
  await page.getByLabel('Scramble sequence').fill("R U F2 L D2 B R2 U' F D L2");
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.locator('[data-roux-route]').first()).toBeVisible({ timeout: 35000 });
  const stop = page.getByRole('button', { name: 'Stop search', exact: true });
  if (await stop.isVisible()) await stop.click();
  await expect(page.locator('[data-roux-route]').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toBeVisible();
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await page.getByLabel('Scramble sequence').fill('F');
  await expect(page.locator('[data-roux-phase]')).toHaveAttribute('data-roux-phase', 'idle');
  await expect(page.locator('[data-roux-route]')).toHaveCount(0);
  await page.getByRole('button', { name: 'White / blue only' }).click();
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.locator('[data-roux-route]').first()).toBeVisible({ timeout: 35000 });
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toContainText(
    'white / blue',
  );
  await page.getByRole('button', { name: 'Face colors', exact: true }).click();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
