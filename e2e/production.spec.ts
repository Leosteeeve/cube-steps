import { test, expect } from '@playwright/test';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
import { enterFacelets, renderedColors, matchesBoundary } from './helpers/color-entry';

test('production CFOP preserves method, exact scramble/colors, solved rendering and refreshed routes', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [],
    failures: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  const solved = () =>
    page.evaluate(async () =>
      (
        await (
          document.querySelector('twisty-player') as any
        ).experimentalModel.currentPattern.get()
      ).experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true }),
    );
  await page.goto('#/learn/cfop/intro');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Think in pairs. Solve in four phases.', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Solve your cube', exact: true }).click();
  await expect(page).toHaveURL(/#\/solve\/cfop$/);
  await page.reload();
  const example = GOLDEN_CASES[7];
  await page.getByLabel('Scramble sequence').fill(example.moves.join(' '));
  await page.getByRole('button', { name: 'Explain this solve', exact: true }).click();
  await expect(page.getByText('Verified Beginner CFOP solution')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(example.facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect.poll(solved).toBe(true);
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: 'LBL', exact: true })
    .click();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue(example.moves.join(' '));
  await expect(page.locator('.solution-summary')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: /Beginner CFOP/ })
    .click();
  await enterFacelets(page, example.facelets);
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with Beginner CFOP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(example.facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect.poll(solved).toBe(true);
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
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
  // Refresh a loaded lesson. Reloading during the previous document's route
  // effect can abort its worker request and emit a WebKit access-control error.
  await expect(
    page.getByRole('heading', { name: 'Finish the yellow corners', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Finish the yellow corners', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(badAssets).toEqual([]);
});
test('production color entry uses the deployed worker and exact initial renderer state after refresh', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [],
    failures: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto('#/solve');
  await enterFacelets(page, GOLDEN_CASES[7].facelets);
  await page.reload();
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await expect(page.getByText('48 / 48 stickers entered')).toBeVisible();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(GOLDEN_CASES[7].facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
