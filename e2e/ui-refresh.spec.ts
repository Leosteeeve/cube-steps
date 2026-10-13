import { test, expect } from '@playwright/test';
import { renderNotationFrame } from './helpers/notation';
test('global navigation exposes the active destination and keeps the LBL introduction as home', async ({
  page,
}) => {
  await page.goto('');
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const name of ['Learn the method', 'Solve your cube', 'Algorithms', 'Practice']) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('main h1')).toBeVisible();
  }
  expect(await nav.getByRole('link').allTextContents()).toHaveLength(4);
  await expect(page.getByRole('link', { name: 'Moves', exact: true })).toHaveCount(0);
});
for (const width of [360, 390, 768, 1024, 1440])
  test(`global cards and controls fit ${width}`, async ({ page }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [route, label] of [
      ['#/learn/white-cross', 'learn'],
      ['#/solve', 'solve'],
      ['#/algorithms', 'library'],
      ['#/practice', 'practice'],
    ] as const) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      if (label === 'learn') {
        await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
        await renderNotationFrame(page);
      }
      if (label === 'library') {
        await page.getByRole('searchbox', { name: 'Search cases' }).fill('OLL 20');
        await expect(page.locator('.case-tile')).toHaveCount(1);
      }
      if (label === 'solve')
        await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        label,
      ).toBe(true);
      await page.screenshot({
        path: `test-results/global-${label}-${width}-${info.project.name}.png`,
        fullPage: label !== 'practice',
        animations: 'disabled',
      });
    }
    await page.getByRole('link', { name: 'CubeSteps home', exact: true }).focus();
    await expect(page.getByRole('link', { name: 'CubeSteps home', exact: true })).toBeFocused();
    const focus = await page
      .getByRole('link', { name: 'CubeSteps home', exact: true })
      .evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(focus)).toBeGreaterThanOrEqual(2);
    expect(errors).toEqual([]);
  });
