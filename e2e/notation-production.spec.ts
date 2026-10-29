import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets } from '../src/core/facelets';
import { NOTATION_ENTRIES } from '../src/club/moves/catalog';
import { buildNotationDemo } from '../src/club/moves/demonstration';
import { REFERENCE_FACELETS } from '../src/club/moves/fixtures/reference-facelets';
import { renderedColors } from './helpers/color-entry';
import { selectNotation } from './helpers/notation';

test('built move explorer refreshes and all 54 moves match every rendered sticker', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [],
    bad: string[] = [],
    modules: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) bad.push(response.url());
    if (response.url().endsWith('.js')) modules.push(response.url());
  });
  const engine = await createCubeEngine();
  await page.goto('club/#/moves');
  await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
  await page.reload();
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
  expect(modules.some((url) => /\/assets\/MoveExplorerPage-[^/]+\.js$/.test(url))).toBe(true);
  expect(modules.some((url) => /\/assets\/cubing~twisty-dynamic-3d-/.test(url))).toBe(true);
  expect(modules.filter((url) => url.includes('/src/'))).toEqual([]);
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});

test('built move explorer provides static endpoints when WebGL is unavailable', async ({
  page,
}) => {
  const errors: string[] = [],
    bad: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) bad.push(response.url());
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      return type === 'webgl2' ? null : (original as any).call(this, type, ...args);
    } as typeof original;
  });
  await page.goto('club/#/moves');
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('3D animation is unavailable');
  const engine = await createCubeEngine();
  for (const move of ['U', "U'", 'U2', 'D', 'B', 'Rw', 'M', 'x']) {
    await selectNotation(page, move);
    await page.getByRole('button', { name: 'After', exact: true }).click();
    const actual = await page
      .locator('.notation-net [data-face]')
      .evaluateAll((faces) =>
        Object.fromEntries(
          faces.map((face) => [
            face.getAttribute('data-face'),
            Array.from(face.querySelectorAll('[data-color]'), (sticker) =>
              sticker.getAttribute('data-color'),
            ),
          ]),
        ),
      );
    expect(actual).toEqual(stateToFacelets(engine.apply(engine.solved(), [move as any])));
  }
  await expect(page.getByLabel('Current holding')).toContainText('green up · yellow front');
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});

test('a rejected production lazy module has a visible reload recovery and usable home', async ({
  page,
}) => {
  const errors: string[] = [],
    failed: string[] = [],
    bad: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) bad.push(response.url());
  });
  const modulePattern = '**/assets/MoveExplorerPage-*.js';
  await page.route(modulePattern, (route) => route.abort());
  await page.goto('club/#/moves');
  await expect(page.getByRole('alert')).toContainText('could not load');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pick up a cube.' })).toBeVisible();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('link', { name: 'Moves', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload move explorer' })).toBeVisible();
  await page.unroute(modulePattern);
  await page.getByRole('button', { name: 'Reload move explorer' }).click();
  await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
  expect(failed.length).toBeGreaterThan(0);
  expect(failed.every((url) => /\/assets\/MoveExplorerPage-[^/]+\.js$/.test(url))).toBe(true);
  expect(
    errors.filter(
      (message) =>
        !/MoveExplorerPage|dynamically imported module|Importing a module script failed/.test(
          message,
        ),
    ),
  ).toEqual([]);
  expect(bad).toEqual([]);
});

test.beforeEach(async ({ page }) => {
  await page.goto('club/');
  await dismissTutorialForTest(page);
});
