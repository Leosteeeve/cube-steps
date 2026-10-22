import { test, expect } from '@playwright/test';

test('Guide loads the film only on request and keeps written help available', async ({ page }) => {
  const mediaRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('club-guide-video-v2.mp4')) mediaRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('club/#/guide');
  const watch = page.getByRole('button', { name: 'Watch the 5-minute guide' });
  await expect(watch).toBeVisible();
  await expect(
    page.getByText(
      '5 minutes · English on-screen instructions · Music & sound effects · No narration',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Origami — Scott Buckley' })).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Find your first step' })).toBeVisible();
  expect(mediaRequests).toEqual([]);
  await watch.click();
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /club-guide-video-v2\.mp4$/);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(300, 0);
  await video.evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    return v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await video.evaluate((v: HTMLVideoElement) => {
    v.pause();
    v.currentTime = 200;
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking)).toBe(false);
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByText('Read the on-screen guide', { exact: true }).click();
  await expect(
    page.getByText('Your results are stored locally, not automatically synced.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('Your turn. Keep your curiosity.', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test('an unavailable film preserves the written Guide and a download alternative', async ({
  page,
}) => {
  await page.goto('club/#/guide');
  await page.getByRole('button', { name: 'Watch the 5-minute guide' }).click();
  // WebKit on Windows fetches media outside Playwright's route interception.
  // A real missing URL exercises the browser's error path on both engines.
  await page.locator('video').evaluate((v: HTMLVideoElement) => {
    v.src = new URL('missing-video-fixture.mp4', v.src).href;
    v.load();
  });
  await expect(page.getByRole('status')).toContainText('The video could not load');
  await expect(page.getByRole('link', { name: 'Download video (36 MB)' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Guide chapters' })
    .getByRole('link', { name: /Read a move/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Read a move, then try it' })).toBeFocused();
});
