import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import accepted from '../docs/media/editorial-refresh/full-film-manifest.json' with { type: 'json' };
import intro from '../docs/media/editorial-refresh/short-film-manifest.json' with { type: 'json' };

test('Guide loads the film only on request and keeps written help available', async ({ page }) => {
  const mediaRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (/club-guide-video[^/]*\.mp4/.test(request.url())) mediaRequests.push(request.url());
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
  await expect(video).toHaveAttribute('src', /club-guide-video-v4\.mp4$/);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(
    accepted.durationSeconds,
    1,
  );
  await video.evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    return v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  // Playing a frame does not guarantee the closing segment is seekable yet.
  // A seek outside the available ranges can be clamped or ignored by the browser.
  await expect
    .poll(() =>
      video.evaluate((v: HTMLVideoElement) => {
        const ranges = v.seekable;
        for (let i = 0; i < ranges.length; i++) {
          if (ranges.start(i) <= 294 && ranges.end(i) >= 294) return true;
        }
        return false;
      }),
    )
    .toBe(true);
  await video.evaluate((v: HTMLVideoElement) => {
    v.pause();
    v.currentTime = 294;
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeCloseTo(294, 0);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking)).toBe(false);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(294, 0);
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByText('Read the on-screen guide', { exact: true }).click();
  await expect(page.getByText('History stays in this browser', { exact: false })).toBeVisible();
  await expect(page.getByText('Your turn. Keep your curiosity.', { exact: false })).toBeVisible();
  await expect(page.getByText('Full guide: open Guide', { exact: false })).toBeVisible();
  const download = page.getByRole('link', { name: 'Download video (23 MB)' });
  const response = await page.request.get((await download.getAttribute('href'))!);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('video/mp4');
  const bytes = await response.body();
  expect(bytes.length).toBe(accepted.bytes);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(accepted.sha256);
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
  await expect(page.getByRole('link', { name: 'Download video (23 MB)' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Guide chapters' })
    .getByRole('link', { name: /Read a move/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Read a move, then try it' })).toBeFocused();
});

test('the introduction plays and seeks; keyboard switching unloads it without autoplay', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('club/#/guide');
  const choose = page.getByRole('button', { name: '30-second introduction', exact: true });
  await choose.focus();
  await page.keyboard.press('Space');
  await expect(choose).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Watch the 30-second introduction' }).click();
  const video = page.locator('video');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(
    intro.durationSeconds,
    1,
  );
  await video.evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    return v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      video.evaluate((v: HTMLVideoElement) => {
        for (let i = 0; i < v.seekable.length; i++)
          if (v.seekable.start(i) <= 27 && v.seekable.end(i) >= 27) return true;
        return false;
      }),
    )
    .toBe(true);
  await video.evaluate((v: HTMLVideoElement) => {
    v.pause();
    v.currentTime = 27;
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking)).toBe(false);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(27, 0);
  const download = page.getByRole('link', { name: 'Download video (2 MB)' });
  const response = await page.request.get((await download.getAttribute('href'))!);
  const bytes = await response.body();
  expect(bytes.length).toBe(intro.bytes);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(intro.sha256);
  const range = await page.request.get((await download.getAttribute('href'))!, {
    headers: { Range: 'bytes=0-1023' },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(1024);
  await page.getByRole('button', { name: '5-minute guide', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Watch the 5-minute guide' })).toBeVisible();
  expect(errors).toEqual([]);
});
