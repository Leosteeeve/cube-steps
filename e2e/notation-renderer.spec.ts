import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets } from '../src/core/facelets';
import { NOTATION_ENTRIES } from '../src/club/moves/catalog';
import { buildNotationDemo } from '../src/club/moves/demonstration';
import { REFERENCE_FACELETS } from '../src/club/moves/fixtures/reference-facelets';
import { renderedColors } from './helpers/color-entry';
import { selectNotation } from './helpers/notation';
test('all 54 single moves preserve native renderer stickers including centers', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const engine = await createCubeEngine();
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  for (const { base } of NOTATION_ENTRIES)
    for (const amount of ['', "'", '2'] as const) {
      const demo = buildNotationDemo(engine, { base, amount });
      await selectNotation(page, demo.move);
      await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
      await expect.poll(() => renderedColors(page)).toEqual(stateToFacelets(demo.initial));
      await page.getByRole('button', { name: 'Play move', exact: true }).click();
      await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'complete');
      await expect.poll(() => renderedColors(page)).toEqual(stateToFacelets(demo.final));
      if (REFERENCE_FACELETS[demo.move])
        expect(await renderedColors(page)).toEqual(REFERENCE_FACELETS[demo.move]);
    }
  expect(errors).toEqual([]);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('twisty-player')).toHaveCount(0);
  await page.goto('about:blank');
  expect(errors).toEqual([]);
});
test('camera changes preserve a partial move and all representative layers animate', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  for (const move of ['U', "U'", 'D', "D'", 'B', "B'", 'M', "M'", 'E', 'S', 'Rw', 'x']) {
    await selectNotation(page, move);
    await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Direction view', exact: true }).click();
    await page.getByLabel('Move speed').selectOption('0.5');
    await page.getByRole('button', { name: 'Play move', exact: true }).click();
    await expect
      .poll(async () =>
        Number(await page.locator('.notation-player').getAttribute('data-progress')),
      )
      .toBeGreaterThan(0.25);
    await page.getByRole('button', { name: 'Pause move', exact: true }).click();
    const progress = await page.locator('.notation-player').getAttribute('data-progress');
    expect(Number(progress)).toBeLessThan(1);
    const before = await renderedColors(page);
    await page.screenshot({
      path: `test-results/notation-${move.replace("'", 'prime')}-${info.project.name}.png`,
    });
    await page.getByRole('button', { name: 'Holding view', exact: true }).click();
    await expect(page.locator('.notation-player')).toHaveAttribute('data-progress', progress!);
    expect(await renderedColors(page)).toEqual(before);
  }
  expect(errors).toEqual([]);
});
