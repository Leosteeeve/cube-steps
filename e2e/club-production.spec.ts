import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
import { renderLessonFrame } from './helpers/notation';

test('built club home stays lightweight and both editions retain their tools', async ({ page }) => {
  test.setTimeout(90000);
  const requests: string[] = [],
    errors: string[] = [],
    bad: string[] = [],
    workers: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('worker', (worker) => workers.push(worker.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) bad.push(response.url());
  });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await expect(page.getByRole('button', { name: 'Watch a turn', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Find my starting point' }).click();
  await expect(page.getByRole('button', { name: 'Skip questions' })).toBeVisible();
  expect(
    requests.filter((url) =>
      /twisty-dynamic|search-worker|search-dynamic|solve\.worker|practice\.worker|\/registry-/.test(
        url,
      ),
    ),
  ).toEqual([]);
  expect(workers).toEqual([]);
  for (const edition of ['', 'club/']) {
    await page.goto(edition + '#/learn/white-cross');
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await page.goto(edition + '#/solve');
    await page.getByLabel('Scramble sequence').fill('R U F2');
    await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
    await expect(page.getByText('Verified LBL solution')).toBeVisible();
    await page.goto(edition + '#/algorithms');
    await page.getByRole('searchbox', { name: 'Search cases' }).fill('OLL 20');
    await expect(page.locator('.case-tile')).toHaveCount(1);
    await page.goto(edition + '#/practice');
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.goto('club/#/timer');
  await dismissTutorialForTest(page);
  await expect(page.getByRole('button', { name: 'Timing surface', exact: true })).toBeEnabled({
    timeout: 25000,
  });
  expect(workers.some((url) => /\/assets\/solve\.worker-[^/]+\.js$/.test(url))).toBe(true);
  expect(requests.some((url) => /\/assets\/cubing~search-worker-entry-/.test(url))).toBe(true);
  expect(requests.filter((url) => url.includes('/src/'))).toEqual([]);
  await page.goto('./?fixture=notation');
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
  await expect(page.locator('.notation-player')).toHaveCount(0);
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Moves', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
test('production club deep links, motion preferences and global identity remain independent', async ({
  page,
}) => {
  const errors: string[] = [],
    bad: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await expect(page.getByRole('link', { name: 'Find my starting point' })).toBeVisible();
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(favicon).toBeTruthy();
  expect((await page.request.get(new URL(favicon!, page.url()).href)).ok()).toBe(true);
  await page.goto('club/#/learn/white-cross');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await renderLessonFrame(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await renderLessonFrame(page);
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByLabel('Current holding')).toContainText('yellow up');
  const before = await page.getByTestId('move-position').textContent();
  const holding = await page.getByLabel('Current holding').textContent();
  const select = page.getByLabel('Decorative motion');
  await select.focus();
  await select.selectOption('off');
  await expect(select).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.getByTestId('move-position')).toHaveText(before!);
  await expect(page.getByLabel('Current holding')).toHaveText(holding!);
  // Keep reload coverage meaningful on a cold/slow renderer download.
  await page.route('**/assets/*twisty-dynamic-3d*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await renderLessonFrame(page);
  await expect(select).toHaveValue('off');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await select.selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./#/learn/notation');
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'global');
  await expect(page.getByLabel('Decorative motion')).toHaveValue('system');
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
