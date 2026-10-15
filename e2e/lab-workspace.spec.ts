import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
for (const width of [1440, 390])
  test('Lab results, pins, comparisons and input edits at ' + width, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('club/');
    await dismissTutorialForTest(page);
    await page.goto('club/#/lab');
    await expect(page.getByText('CFOP Lab · Experimental', { exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Learning tools' })).toHaveCount(0);
    await page.getByLabel('Scramble sequence').fill("R U F2 L D2 B R2 U' F D L2");
    await page.getByRole('button', { name: 'Analyze', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect
      .poll(() => page.locator('.lab-candidate').count(), { timeout: 20000 })
      .toBeGreaterThanOrEqual(2);
    await page.getByRole('button', { name: 'Stop analysis' }).click();
    const cards = page.locator('.lab-candidate');
    const id = await cards.first().getAttribute('data-route-id');
    await cards
      .first()
      .getByRole('button', { name: /Pin.*playback/ })
      .click();
    await cards.nth(0).getByLabel('Compare this route').check();
    await cards.nth(1).getByLabel('Compare this route').check();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await page
      .getByRole('navigation', { name: 'Lab workspace' })
      .getByRole('link', { name: 'Compare' })
      .click();
    await expect(page.getByRole('region', { name: 'Comparison table' })).toBeVisible();
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await page.getByTestId('move-position').boundingBox())!.height).toBeLessThan(45);
    await page.locator('twisty-player').scrollIntoViewIfNeeded();
    await page.locator('twisty-player').evaluate(async (p: any) => {
      for (const v of await p.experimentalCurrentVantages()) await v.render();
    });
    await page.screenshot({
      path: `test-results/lab-compare-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole('navigation', { name: 'Lab workspace' })
      .getByRole('link', { name: 'Analyze' })
      .click();
    await expect(
      page.locator(`[data-route-id="${id}"]`).getByRole('button', { name: 'Pinned for playback' }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/lab-analyze-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByLabel('Scramble sequence').fill('R Z');
    await expect(page.getByText(/Input changed. Previous recommendations/)).toBeVisible();
    await expect(cards).toHaveCount(0);
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('At character 3');
    await page.getByRole('button', { name: 'Face colors', exact: true }).click();
    await page.getByRole('button', { name: 'Check colors', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
test('Lab is lazy on ordinary pages; direct links reload without replaying a search', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  for (const path of ['./', 'club/', 'club/#/timer', 'club/#/guide']) {
    requests.length = 0;
    await page.goto(path);
    if (path.startsWith('club/')) await dismissTutorialForTest(page);
    await page.waitForTimeout(300);
    expect(
      requests.filter((url) => /\/lab\/|lab\.worker|lab-request|execution\/profiles/.test(url)),
    ).toEqual([]);
    if (path === './') await expect(page.getByRole('link', { name: 'CFOP Lab' })).toHaveCount(0);
  }
  for (const suffix of ['compare', 'trials']) {
    await page.goto('club/#/lab/' + suffix);
    await expect(page.getByText('CFOP Lab · Experimental', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Ready to explore', { exact: true })).toBeVisible();
  }
});
test('failed assets stay distinct from illegal input and the workspace fits a doubled layout scale', async ({
  page,
}) => {
  await page.route('**/distance-v1.bin*', (r) => r.fulfill({ status: 404, body: 'missing' }));
  await page.setViewportSize({ width: 780, height: 950 });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/lab');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await page.getByLabel('Scramble sequence').fill('R U');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/assets|asset|load/i);
  await expect(page.getByText('Analysis could not continue', { exact: true })).toBeVisible();
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        right: e.getBoundingClientRect().right,
        width: e.getBoundingClientRect().width,
      })),
  }));
  expect(layout.scroll <= layout.width, JSON.stringify(layout)).toBe(true);
});
