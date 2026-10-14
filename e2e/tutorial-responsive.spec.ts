import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';

test('rotating a hands-on tour keeps the requested face unobscured', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.setViewportSize({ width: 640, height: 360 });
  const upper = page.getByRole('button', { name: 'U, Up face', exact: true });
  for (const zoom of [1, 1.5]) {
    await page.evaluate((value) => {
      document.documentElement.style.zoom = String(value);
    }, zoom);
    await expect
      .poll(() =>
        upper.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }),
      )
      .toBe(true);
    await expect(page.getByRole('button', { name: 'Exit tour' })).toBeInViewport();
  }
  await page.keyboard.press('Escape');
});

test('tall phone screenshots enlarge at readable width with a reachable close button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('club/#/guide/moves');
  const trigger = page
    .locator('.guide-image-button')
    .filter({ has: page.locator('img[src$="moves-phone.png"]') });
  await trigger.scrollIntoViewIfNeeded();
  const before = await trigger.locator('img').boundingBox();
  await trigger.click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect
    .poll(async () => (await modal.locator('img').boundingBox())!.width)
    .toBeGreaterThanOrEqual(before!.width);
  await modal.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByRole('button', { name: 'Close image' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
