import { test, expect } from '@playwright/test';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
import { enterFacelets, renderedColors, matchesBoundary } from './helpers/color-entry';
import { createCubeEngine } from '../src/core/cube';
import { solveLBL } from '../src/methods/lbl/solve';
import { flattenTrace } from '../src/methods/lbl/trace';
test('entered colors match all 54 actual renderer stickers and every playback boundary', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [],
    badAssets: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) badAssets.push(response.url());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('#/solve');
  const example = GOLDEN_CASES[7];
  await enterFacelets(page, example.facelets);
  await page.getByRole('button', { name: 'Front face', exact: true }).click();
  await page.getByRole('button', { name: 'Eraser', exact: true }).click();
  await page.getByRole('button', { name: /^Front, row 1, column 1,/ }).click();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('remaining 1');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/colors-editor-${testInfo.project.name}-desktop.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Review all faces', exact: true }).click();
  const overview = page.locator('.entry-review');
  for (const face of ['F', 'R', 'B', 'L', 'U', 'D'] as const)
    for (let index = 0; index < 9; index++)
      await expect(overview.locator(`[data-facelet="${face}${index}"]`)).toHaveAttribute(
        'data-color',
        example.facelets[face][index],
      );
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(example.facelets);
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await expect(page.getByText('Scramble for this solution')).toHaveCount(0);
  const engine = await createCubeEngine(),
    result = solveLBL(engine, engine.apply(engine.solved(), example.moves));
  if (!result.ok) throw new Error(result.message);
  const flat = flattenTrace(result.trace);
  await expect(page.getByTestId('move-position')).toHaveText(`Move 0 of ${flat.moves.length}`);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect.poll(() => matchesBoundary(page)).toBe(true);
  }
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  const slider = page.getByLabel('Move position');
  const regrip = flat.moves.findIndex((move) => /^[xyz]/.test(move));
  expect(regrip).toBeGreaterThanOrEqual(0);
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i <= regrip; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  const formula = flat.actions.find((item) => item.action.kind === 'algorithm')!;
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < formula.start; i++) await page.keyboard.press('ArrowRight');
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Replay formula', exact: false }).click();
  await expect(page.getByTestId('move-position')).toHaveText(
    `Move ${formula.end} of ${flat.moves.length}`,
    { timeout: 20000 },
  );
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await page.getByRole('button', { name: '02 First-layer corners', exact: true }).click();
  const stageStart = await page.getByTestId('move-position').innerText();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await page.getByRole('button', { name: '02 First-layer corners', exact: true }).click();
  await expect(page.getByTestId('move-position')).toHaveText(stageStart);
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  const cube = await page.locator('twisty-player').boundingBox();
  if (!cube) throw new Error('Missing rendered cube');
  await page.mouse.move(cube.x + cube.width / 2, cube.y + cube.height / 2);
  await page.mouse.down();
  await page.mouse.move(cube.x + cube.width / 2 + 50, cube.y + cube.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('move-position')).toHaveText(stageStart);
  await slider.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/colors-solution-${testInfo.project.name}-desktop.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(badAssets).toEqual([]);
});
test('mobile keyboard entry, review, refresh and lesson return preserve the draft', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/solve');
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await page.getByRole('button', { name: 'Blue', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Front, row 1, column 1, unfilled' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Front, row 1, column 1, blue' })).toBeVisible();
  const targets = page.locator(
    '.sticker-grid.editable button, .face-steps button, .color-palette button, .face-navigation button',
  );
  for (const button of await targets.all()) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/colors-editor-${testInfo.project.name}-mobile.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Up face', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Up face', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Blue', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Learn the method', exact: true }).click();
  await page.getByRole('link', { name: 'Solve your cube', exact: true }).click();
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await page.getByRole('button', { name: 'Front face', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Front, row 1, column 1, blue' })).toBeVisible();
  await page.getByRole('button', { name: 'Review all faces', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your cube' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/colors-review-${testInfo.project.name}-mobile.png`,
    fullPage: true,
  });
});
test('malformed saved input starts blank and storage denial still allows entering and solving', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('#/solve');
  await page.evaluate(() =>
    sessionStorage.setItem('cubesteps.color-draft.v1', '{"version":1,"draft":{"facelets":{}}}'),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await expect(page.getByText('0 / 48 stickers entered')).toBeVisible();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.reload();
  await enterFacelets(page, GOLDEN_CASES[7].facelets);
  await expect(page.getByText(/cannot be restored after refresh/)).toBeVisible();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(GOLDEN_CASES[7].facelets);
});
test('without WebGL, entered colors still produce readable steps and reduced-motion controls', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      return type === 'webgl2' ? null : (original as any).call(this, type, ...args);
    } as any;
  });
  await page.goto('#/solve');
  await enterFacelets(page, GOLDEN_CASES[7].facelets);
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('3D rendering is unavailable');
  await expect(page.getByRole('heading', { name: 'Observe', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByTestId('move-position')).toContainText('Move 1 of');
});
