import { test, expect, type Page } from '@playwright/test';
const matches = (page: Page) =>
  page.evaluate(async () => {
    const p = document.querySelector('twisty-player') as any;
    if (!p) return false;
    return (
      JSON.stringify((await p.experimentalModel.currentPattern.get()).patternData) ===
      document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')
    );
  });
for (const width of [1440, 390])
  test(
    'partial formulas preserve native boundaries and completion at ' + width,
    async ({ page }, info) => {
      test.setTimeout(150000);
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('?fixture=player');
      for (const id of ['demo-oll-20', 'demo-pll-z', 'demo-f2l-mixed']) {
        await page.getByLabel('Fixture', { exact: true }).selectOption(id, { timeout: 5000 });
        await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
        await expect(page.getByLabel('Move position')).toHaveValue('0');
        await expect.poll(() => matches(page)).toBe(true);
        const total = Number(await page.getByLabel('Move position').getAttribute('max'));
        for (let i = 0; i < total; i++) {
          await page.getByRole('button', { name: 'Next move', exact: true }).click();
          await expect.poll(() => matches(page)).toBe(true);
          await page.getByRole('button', { name: 'Previous move', exact: true }).click();
          await expect.poll(() => matches(page)).toBe(true);
          await page.getByRole('button', { name: 'Next move', exact: true }).click();
        }
        await expect(
          page.getByRole('heading', { name: 'Algorithm complete.', exact: true }),
        ).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toHaveCount(
          0,
        );
        await expect(page.getByRole('button', { name: /Replay formula/ })).toBeEnabled();
        await page.getByLabel('Playback speed').selectOption('2');
        await page.getByRole('button', { name: /Replay formula/ }).click();
        await expect(page.getByTestId('move-position')).toHaveText(
          'Move ' + total + ' of ' + total,
          { timeout: 20000 },
        );
        await expect.poll(() => matches(page)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
      await page.screenshot({
        path: 'test-results/advanced-partial-' + width + '-' + info.project.name + '.png',
        fullPage: true,
      });
    },
  );
test('native renderer tracks every notation token including E and S centers', async ({ page }) => {
  await page.goto('?fixture=player');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  const result = await page.evaluate(async () => {
    const url = new URL('src/core/cube.ts', location.href).href,
      { createCubeEngine } = await import(url),
      engine = await createCubeEngine();
    const tokens = [
      'U',
      'D',
      'L',
      'R',
      'F',
      'B',
      'Uw',
      'Dw',
      'Lw',
      'Rw',
      'Fw',
      'Bw',
      'M',
      'E',
      'S',
      'x',
      'y',
      'z',
    ].flatMap((face) => ['', "'", '2'].map((s) => face + s));
    const inverse = (m: string) =>
      m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : m + "'";
    const moves = tokens.flatMap((m) => [m, inverse(m)]),
      p = document.querySelector('twisty-player') as any;
    p.alg = moves.join(' ');
    p.experimentalSetupAlg = '';
    p.timestamp = 0;
    const indexer = await p.experimentalModel.indexer.get(),
      states = [engine.solved()];
    for (const move of moves) states.push(engine.apply(states.at(-1), [move]));
    const failures: string[] = [];
    for (let i = 0; i < states.length; i++) {
      for (const j of i ? [i, i - 1, i] : [0]) {
        p.timestamp =
          j === moves.length ? indexer.algDuration() : indexer.indexToMoveStartTimestamp(j);
        const actual = (await p.experimentalModel.currentPattern.get()).patternData;
        if (JSON.stringify(actual) !== JSON.stringify(states[j].data))
          failures.push(j + ':' + (moves[j - 1] ?? 'start'));
      }
    }
    return { failures, tokens: tokens.length };
  });
  expect(result).toEqual({ failures: [], tokens: 54 });
});
test('advanced color solves retain exact initial state and end solved', async ({ page }) => {
  await page.goto('?fixture=player');
  await page.getByLabel('Fixture', { exact: true }).selectOption('advanced-colors');
  await expect(page.getByText('3 × 3 · Advanced CFOP')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByLabel('Stage', { exact: true }).selectOption('advanced-cross');
  await expect.poll(() => matches(page)).toBe(true);
  const slider = page.getByLabel('Move position'),
    total = await slider.getAttribute('max');
  await slider.fill(total!);
  await expect.poll(() => matches(page)).toBe(true);
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeDisabled();
});
test('partial demonstration remains usable without WebGL', async ({ page }) => {
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
  await page.getByLabel('Fixture', { exact: true }).selectOption('demo-oll-20');
  await expect(page.getByRole('alert')).toContainText('3D rendering is unavailable');
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByTestId('move-position')).toContainText('Move 1 of');
});
