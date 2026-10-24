import { test, expect } from '@playwright/test';

test('view controls persist without replacing the cube or changing physical moves', async ({
  page,
}) => {
  await page.goto('?fixture=player');
  const next = page.getByRole('button', { name: 'Next move', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  const state = await page.locator('[data-boundary-state]').getAttribute('data-boundary-state');
  const position = await page.getByTestId('move-position').innerText();
  await page
    .locator('twisty-player')
    .evaluate((p) => p.setAttribute('data-view-identity', 'retained'));
  await page.getByText('View settings', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Light cube background' }).check();
  await page.getByRole('checkbox', { name: 'Back-face view aid' }).check();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect(page.locator('twisty-player')).toHaveAttribute('data-view-identity', 'retained');
  await expect(page.getByTestId('move-position')).toHaveText(position);
  await expect(page.locator('[data-boundary-state]')).toHaveAttribute(
    'data-boundary-state',
    state!,
  );
  await page.reload();
  await expect(next).toBeEnabled();
  await page.getByText('View settings', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Light cube background' })).toBeChecked();
});
test('reduced motion advances only through whole-move renderer boundaries', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?fixture=player');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByTestId('move-position')).not.toContainText('Move 0 of');
  const boundary = await page.evaluate(async () => {
    const p = document.querySelector('twisty-player') as any;
    const t = await p.experimentalGet.timestamp(),
      i = await p.experimentalModel.indexer.get();
    return (
      Array.from({ length: i.numAnimatedLeaves() }, (_, n) =>
        i.indexToMoveStartTimestamp(n),
      ).includes(t) || t === i.algDuration()
    );
  });
  expect(boundary).toBe(true);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});
test('real renderer follows stepping, regrips, stage jumps, and camera orbit', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?fixture=player');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect(page.locator('twisty-player')).toBeVisible();
  const matches = () =>
    page.evaluate(async () => {
      const player = document.querySelector('twisty-player') as any;
      const actual = (await player.experimentalModel.currentPattern.get()).patternData;
      const expected = JSON.parse(
        document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')!,
      );
      return JSON.stringify(actual) === JSON.stringify(expected);
    });
  await expect.poll(matches).toBe(true);
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect.poll(matches).toBe(true);
  }
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await expect.poll(matches).toBe(true);
  await page.getByLabel('Stage').selectOption('first-layer');
  await expect.poll(matches).toBe(true);
  const position = await page.getByTestId('move-position').innerText();
  const cube = await page.locator('twisty-player').boundingBox();
  if (!cube) throw new Error('No cube bounds');
  await page.mouse.move(cube.x + cube.width / 2, cube.y + cube.height / 2);
  await page.mouse.down();
  await page.mouse.move(cube.x + cube.width / 2 + 60, cube.y + cube.height / 2 + 20, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('move-position')).toHaveText(position);
  await expect.poll(matches).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/player-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('preserves readable steps and controls when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      if (type === 'webgl2') return null;
      return (original as any).call(this, type, ...args);
    } as any;
  });
  await page.goto('?fixture=player');
  await expect(page.getByRole('alert')).toContainText('3D rendering is unavailable');
  await expect(page.getByRole('heading', { name: 'Observe', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByTestId('move-position')).toContainText('Move 1 of');
});
