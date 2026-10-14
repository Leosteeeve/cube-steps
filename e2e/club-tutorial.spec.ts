import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('optional welcome, keyboard tour, phone resize, exit and remembered choice', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 850 });
    await page.getByRole('button', { name: 'Page tour', exact: true }).click();
    const bubble = page.getByRole('dialog', { name: 'A small first step' });
    await expect(bubble).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Learn the letters' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Restart the next run at the first step through the existing progress reset for this test.
    await page.evaluate(() => {
      const key = 'cubesteps.club.tutorial.v1',
        data = JSON.parse(localStorage.getItem(key)!);
      data.tours = {};
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.reload();
  }
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit tour' })).toBeInViewport();
  await page.getByRole('button', { name: 'Exit tour' }).click();
  expect(errors).toEqual([]);
});
test('deep link opens its own tour and browser navigation ends it', async ({ page }) => {
  await page.goto('club/#/find-your-route');
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Start where you are' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#/';
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
