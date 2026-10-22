import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { matchesBoundary } from './helpers/color-entry';
test('Roux slice checkpoints, corner restoration, keyboard and exact final state', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/learn/roux/roux-first-block');
  await dismissTutorialForTest(page);
  await page.getByLabel('Practice case').selectOption('left-m');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  for (let i = 0; i < 60; i++) {
    if (
      (await page.locator('.roux-holding-guide').getAttribute('data-reference')) ===
      'setup-required'
    )
      break;
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
  }
  await expect(page.getByText(/Middle-slice setup in progress/)).toBeVisible();
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  const position = Number(await page.getByLabel('Move position').inputValue());
  await page.getByRole('button', { name: 'Previous move', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Move position')).toHaveValue(String(position - 1));
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('club/#/learn/roux/roux-corner-orientation');
  await page.getByLabel('Practice case').selectOption('roux-ocll-27');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByText(/Finish the whole corner formula before/)).toBeVisible();
  await page.getByRole('button', { name: /Replay formula/ }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  expect(
    await page.locator('twisty-player').evaluate(async (p: any) =>
      (await p.experimentalModel.currentPattern.get()).experimentalIsSolved({
        ignorePuzzleOrientation: true,
        ignoreCenterOrientation: true,
      }),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
