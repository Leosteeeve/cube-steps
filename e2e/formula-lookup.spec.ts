import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';

test('keeps the CFOP lookup and selection through keyboard detail and practice navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('club/#/algorithms');
  await dismissTutorialForTest(page);
  const search = page.getByRole('searchbox', { name: 'Search cases' });
  for (const text of ['OLL27', 'OLL 27', 'oll-27']) {
    await search.fill(text);
    await expect(page.getByRole('status').filter({ hasText: /^1 case$/ })).toBeVisible();
    await expect(page.locator('.case-tile')).toHaveCount(1);
  }
  const choice = page.getByRole('checkbox', { name: 'Select OLL 27', exact: true });
  await choice.focus();
  await page.keyboard.press('Space');
  const link = page.getByRole('link', { name: 'Explore OLL 27 →' });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/algorithms\/oll-27$/);
  await page.goBack();
  await expect(search).toHaveValue('oll-27');
  await expect(choice).toBeChecked();
  await search.fill('made-up case');
  await expect(page.getByRole('heading', { name: 'No matching cases' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.case-tile')).toHaveCount(119);
  await expect(choice).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Practice selected cases' }).click();
  await expect(page.getByRole('button', { name: 'Start practice' })).toBeEnabled();
  await expect(page.getByText('1 case selected', { exact: true })).toBeVisible();
});

test('carries the CMLL frame and selected pattern through detail, recovery and the drill', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('club/#/cmll');
  await page.getByRole('button', { name: 'Clear selection' }).click();
  const search = page.getByRole('searchbox');
  await search.fill('cmll-pi-3');
  const check = page.getByRole('checkbox', { name: 'Select Pi X Checkerboard' });
  await check.check();
  await page.getByLabel('Holding frame').selectOption('yellow-red');
  await page.getByRole('link', { name: 'Open CMLL Pi X Checkerboard' }).click();
  await expect(page.getByLabel('Holding frame')).toHaveValue('yellow-red');
  await page.getByRole('link', { name: '← CMLL library', exact: true }).click();
  await expect(search).toHaveValue('cmll-pi-3');
  await expect(check).toBeChecked();
  await search.fill('Pi43');
  await expect(page.getByRole('heading', { name: 'No matching cases' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.cmll-card')).toHaveCount(42);
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Practice selected cases' }).click();
  await expect(page.getByLabel('Holding frame')).toHaveValue('yellow-red');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByTestId('cmll-answer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(
    page.getByTestId('cmll-answer').getByRole('heading', { name: 'Pi · X Checkerboard' }).first(),
  ).toBeVisible();
});
for (const [route, name] of [
  ['algorithms', 'Explore OLL 27 →'],
  ['cmll', 'Open CMLL Sune Columns'],
] as const) {
  test(
    'restores the opened case link and viewport only on a direct return to ' + route,
    async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('club/#/');
      await dismissTutorialForTest(page);
      await page.goto('club/#/' + route);
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toBeVisible({ timeout: 30000 });
      await expect(link).not.toBeFocused();
      await link.focus();
      const previousTop = (await link.boundingBox())!.y;
      await page.keyboard.press('Enter');
      const back = page.locator('main a.back-link, main .cmll-page > a').first();
      await expect(back).toBeVisible();
      if (route === 'algorithms') await page.goBack();
      else await back.click();
      await expect(link).toBeFocused();
      await expect(link).toBeInViewport();
      expect(Math.abs((await link.boundingBox())!.y - previousTop)).toBeLessThan(3);
      await link.click();
      await expect(back).toBeVisible();
      await page.goto('club/#/find-your-route');
      await expect(page.getByRole('button', { name: 'Skip questions' })).toBeVisible();
      await page.goto('club/#/' + route);
      await expect(link).toBeVisible();
      await expect(link).not.toBeFocused();
    },
  );
}
