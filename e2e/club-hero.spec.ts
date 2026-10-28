import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
test('hero visibly turns a layer and keeps its paused frame', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.clock.install();
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.getByRole('button', { name: 'Watch a turn' }).click();
  await expect(page.getByRole('button', { name: 'Pause turn' })).toBeVisible();
  const pixels = () =>
    page.locator('canvas.hero-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const initial = await pixels();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: 'Pause turn' }).click();
  const turning = await pixels();
  expect(turning).not.toBe(initial);
  await page.clock.runFor(4000);
  expect(await pixels()).toBe(turning);
  await page.screenshot({ path: `test-results/hero-mid-turn-${info.project.name}.png` });
});
for (const width of [360, 375, 390, 768, 1024, 1440])
  test(`proportionate club hero and usable entries at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(() =>
      localStorage.setItem(
        'cubesteps.club.progress.v1',
        JSON.stringify({
          version: 1,
          selectedMethod: 'lbl',
          practiced: {},
          lastLesson: { method: 'lbl', lessonId: 'white-cross' },
        }),
      ),
    );
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('request', (req) => requests.push(req.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('club/');
    await dismissTutorialForTest(page);
    await expect(page.getByRole('link', { name: 'Resume learning' })).toHaveAttribute(
      'href',
      '#/learn/white-cross',
    );
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    await navigation.getByRole('button', { name: 'Practice', exact: true }).click();
    await expect(navigation.getByRole('link', { name: 'Timer', exact: true })).toHaveAttribute(
      'href',
      '#/timer',
    );
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Watch a turn' }).click();
    const pause = page.getByRole('button', { name: 'Pause turn' });
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(page.getByRole('button', { name: 'Watch a turn' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/hero-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByLabel('Decorative motion').selectOption('off');
    await expect(page.getByText('Decorative motion is off.')).toBeVisible();
    await page.goto('club/#/find-your-route');
    expect(
      requests.filter((url) =>
        /cubing|solve-worker|search-worker|algorithms\/registry|\/core\/cube\.ts/.test(url),
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
