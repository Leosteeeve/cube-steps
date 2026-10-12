import { test, expect, type Page } from '@playwright/test';
const matches = (page: Page) =>
  page.evaluate(async () => {
    const player = document.querySelector('twisty-player') as any;
    if (!player) return false;
    const actual = (await player.experimentalModel.currentPattern.get()).patternData;
    const expected = JSON.parse(
      document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')!,
    );
    return JSON.stringify(actual) === JSON.stringify(expected);
  });
for (const id of ['pll-h', 'pll-z'])
  test(`CFOP colored ${id} follows every slice boundary, reverse step and replay`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('?fixture=player');
    await page.getByLabel('Fixture', { exact: true }).selectOption(id);
    await expect(page.getByText('3 × 3 · Beginner CFOP')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await expect.poll(() => matches(page)).toBe(true);
    // The first actual move establishes white down from canonical entered colors.
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect(page.locator(`[data-algorithm-id="${id}"]`)).toBeVisible();
    await expect(page.getByText(/M turns the middle slice/)).toBeVisible();
    const card = page.locator(`[data-algorithm-id="${id}"]`);
    const start = Number(await card.getAttribute('data-action-start')),
      end = Number(await card.getAttribute('data-action-end'));
    for (let i = start; i < end; i++) {
      await expect.poll(() => matches(page)).toBe(true);
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
      await expect.poll(() => matches(page)).toBe(true);
      await page.getByRole('button', { name: 'Previous move', exact: true }).click();
      await expect.poll(() => matches(page)).toBe(true);
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Previous move', exact: true }).click();
    await page.getByLabel('Playback speed').selectOption('2');
    await page.getByRole('button', { name: /Replay formula/ }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
      timeout: 12000,
    });
    await expect(page.getByTestId('move-position')).toHaveText(new RegExp(`Move ${end} of`));
    await expect.poll(() => matches(page)).toBe(true);
    const position = await page.getByTestId('move-position').innerText(),
      cube = await page.locator('twisty-player').boundingBox();
    if (!cube) throw new Error('No rendered cube');
    await page.mouse.move(cube.x + cube.width / 2, cube.y + cube.height / 2);
    await page.mouse.down();
    await page.mouse.move(cube.x + cube.width / 2 + 40, cube.y + cube.height / 2 + 20, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(page.getByTestId('move-position')).toHaveText(position);
    await expect.poll(() => matches(page)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/cfop-${id}-${info.project.name}.png`,
      fullPage: true,
    });
  });
test('CFOP keeps text usable without WebGL and handles a zero-move solution', async ({ page }) => {
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
  await page.goto('?fixture=player');
  await page.getByLabel('Fixture', { exact: true }).selectOption('cfop-scramble');
  await expect(page.getByRole('alert')).toContainText('3D rendering is unavailable');
  await expect(page.getByRole('heading', { name: /Pair \d of 4/ })).toBeVisible();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByTestId('move-position')).not.toHaveText('Move 0 of 0');
  await page.getByLabel('Fixture', { exact: true }).selectOption('cfop-solved');
  await expect(page.getByRole('heading', { name: 'Final alignment', exact: true })).toBeVisible();
  await expect(page.getByTestId('move-position')).toHaveText('Move 0 of 0');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await page.getByLabel('Stage', { exact: true }).selectOption('cfop-oll-edges');
  await expect(
    page.getByRole('heading', { name: 'Orient yellow edges', exact: true }),
  ).toBeVisible();
});
