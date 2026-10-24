import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('empty/singleton selected drills persist and keep answers hidden until reveal', async ({
  page,
}) => {
  await page.goto('club/#/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/cmll-practice');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await page.getByLabel('O · Adjacent Swap', { exact: true }).check();
  await page.getByLabel('Holding frame').selectOption('yellow-red');
  await page.reload();
  await expect(page.getByLabel('Holding frame')).toHaveValue('yellow-red');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByTestId('cmll-formula')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Next case', exact: true }).click();
  await expect(page.getByTestId('cmll-formula')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect(
    page.getByTestId('cmll-answer').getByRole('heading', { name: 'O · Adjacent Swap' }).first(),
  ).toBeVisible();
});
