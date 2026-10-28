import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';

for (const width of [375, 768, 1024, 1440]) {
  test(`club learning and practice surfaces fit ${width}`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [route, label] of [
      ['#/find-your-route', 'quiz'],
      ['#/learn/white-cross', 'lesson'],
      ['#/moves', 'moves'],
      ['#/timer', 'timer'],
      ['#/algorithms', 'algorithms'],
      ['#/lab', 'cfop-lab'],
      ['#/roux-lab', 'roux-lab'],
      ['#/guide', 'guide'],
    ]) {
      await page.goto(`club/${route}`);
      await dismissTutorialForTest(page);
      await expect(page.locator('main h1')).toBeVisible();
      if (label === 'lesson') {
        await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        label,
      ).toBe(true);
      await page.screenshot({
        path: `test-results/editorial-${label}-${width}-${info.project.name}.png`,
        // Long libraries and the written Guide exceed WebKit's capture limit.
        fullPage: (await page.evaluate(() => document.documentElement.scrollHeight)) < 16000,
      });
    }
    expect(errors).toEqual([]);
  });
}

test('learning tools menu supports keyboard navigation and route changes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('club/#/learn/roux/intro');
  await dismissTutorialForTest(page);
  await page.evaluate(() => document.fonts.ready);
  const headerBounds = await page.locator('.club-header').boundingBox();
  const nav = page.getByRole('navigation', { name: 'Learning tools' });
  await expect(nav.getByRole('link', { name: 'Lessons', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const menu = nav.getByRole('button', { name: 'More tools' });
  await menu.focus();
  await menu.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await menu.press('ArrowDown');
  const first = nav.getByRole('link', { name: 'CFOP algorithms', exact: true });
  await expect(first).toBeFocused();
  await first.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.press('Enter');
  await nav.getByRole('link', { name: 'Move explorer', exact: true }).click();
  await expect(page).toHaveURL(/#\/moves$/);
  await page.getByRole('link', { name: 'Webb Cubing Club home' }).click();
  await expect(page.getByRole('heading', { name: 'Pick up a cube.' })).toBeVisible();
  // A lazy-loaded Moves stylesheet must not change the shared header's geometry.
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  expect(await page.locator('.club-header').boundingBox()).toEqual(headerBounds);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
