import { test, expect } from '@playwright/test';
test('production base path loads worker, 3D renderer, random scrambles and refreshed routes', async ({
  page,
}) => {
  const errors: string[] = [],
    badAssets: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) badAssets.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('#/solve');
  await page.getByLabel('Scramble sequence').fill("R U2 F' L2 B D'");
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const player = document.querySelector('twisty-player') as any;
        return (await player.experimentalModel.currentPattern.get()).experimentalIsSolved({
          ignorePuzzleOrientation: true,
          ignoreCenterOrientation: true,
        });
      }),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Random scramble', exact: true }).click();
  await expect(page.getByLabel('Scramble sequence')).not.toHaveValue("R U2 F' L2 B D'");
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.goto('#/learn/corner-orientation');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Finish the yellow corners', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(badAssets).toEqual([]);
});
