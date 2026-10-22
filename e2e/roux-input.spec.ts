import { test, expect } from '@playwright/test';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets } from '../src/core/facelets';
import { parseScramble } from '../src/core/notation';
import { dismissTutorialForTest } from './helpers/tutorial';
import { enterFacelets, renderedColors, matchesBoundary } from './helpers/color-entry';
test('random, pasted and live-generated six-face inputs preserve provenance and solve', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/solve/roux');
  await dismissTutorialForTest(page);
  const solve = page.getByRole('button', { name: 'Explain with Beginner Roux', exact: true });
  await page.getByLabel('Scramble sequence').fill('R M');
  await solve.click();
  await expect(page.getByRole('alert')).toContainText('character');
  await page.getByLabel('Scramble sequence').fill('R U F2');
  await solve.click();
  await expect(page.getByText('Verified Beginner Roux solution')).toBeVisible();
  await page.getByRole('button', { name: 'Random scramble', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Random scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const text = await page.getByLabel('Scramble sequence').inputValue(),
    parsed = parseScramble(text);
  if (!parsed.ok) throw Error(parsed.message);
  const e = await createCubeEngine(),
    facelets = stateToFacelets(e.apply(e.solved(), parsed.moves));
  await solve.click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await enterFacelets(page, facelets);
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await solve.click();
  await expect(page.getByText('Verified Beginner Roux solution')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('method switching retains the draft and delayed loading can be cancelled and retried', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/#/solve/roux');
  await dismissTutorialForTest(page);
  await page.getByLabel('Scramble sequence').fill('R U F2');
  await page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: 'Beginner CFOP', exact: true })
    .click();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  await page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: 'Beginner Roux', exact: true })
    .click();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  let release!: () => void;
  let requested!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const assetRequested = new Promise<void>((resolve) => {
    requested = resolve;
  });
  // Hold the actual policy bytes once. Vite also requests a ?url wrapper in
  // both realms; delaying those would multiply the artificial network delay.
  await page.route(
    (url) =>
      url.pathname.includes('block-policies') &&
      url.pathname.endsWith('.json') &&
      !url.searchParams.has('url'),
    async (r) => {
      requested();
      await held;
      await r.continue();
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Explain with Beginner Roux', exact: true }).click();
  await assetRequested;
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  await page.getByLabel('Scramble sequence').fill('L U2');
  await page.getByRole('button', { name: 'Explain with Beginner Roux', exact: true }).click();
  release();
  await expect(page.getByText('Verified Beginner Roux solution')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByText('Scramble for this solution', { exact: true }).click();
  await expect(page.locator('.solution-summary code')).toHaveText('L U2');
});
