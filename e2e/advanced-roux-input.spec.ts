import { test, expect } from '@playwright/test';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets } from '../src/core/facelets';
import { parseScramble } from '../src/core/notation';
import { dismissTutorialForTest } from './helpers/tutorial';
import { enterFacelets, renderedColors, matchesBoundary } from './helpers/color-entry';
test('Advanced Roux verifies solved, text, random and six-color inputs in the chosen frame', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/solve/advanced-roux');
  await dismissTutorialForTest(page);
  const solve = page.getByRole('button', { name: 'Explain with Advanced Roux', exact: true });
  await solve.click();
  await expect(page.getByText('Verified Advanced Roux solution')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Edit cube input', exact: true }).click();
  await page.getByLabel('Scramble sequence').fill('R ?');
  await solve.click();
  await expect(page.getByRole('alert')).toContainText('character');
  await page.getByLabel('Scramble sequence').fill('R U F2');
  await solve.click();
  await expect(page.getByRole('button', { name: 'Edit cube input', exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Edit cube input', exact: true }).click();
  await page.getByRole('button', { name: 'Random scramble', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Random scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const parsed = parseScramble(await page.getByLabel('Scramble sequence').inputValue());
  if (!parsed.ok) throw Error(parsed.message);
  const engine = await createCubeEngine(),
    facelets = stateToFacelets(engine.apply(engine.solved(), parsed.moves));
  await solve.click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await expect.poll(() => renderedColors(page)).toEqual(facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit cube input', exact: true }).click();
  await enterFacelets(page, facelets);
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByLabel('yellow bottom · red left', { exact: true }).check();
  await page.getByLabel('white bottom · blue left', { exact: true }).uncheck();
  await solve.click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await expect.poll(() => renderedColors(page)).toEqual(facelets);
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  expect(errors).toEqual([]);
});
