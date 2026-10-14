import { dismissTutorialForTest } from './helpers/tutorial';
import { test, expect } from '@playwright/test';
test('club homepage fits phones and desktop with clear learning actions', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('club/');
  await dismissTutorialForTest(page);
    await expect(page.getByRole('heading', { name: 'One turn. A new possibility.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find my starting point' })).toHaveAttribute(
      'href',
      '#/find-your-route',
    );
    await expect(page.getByRole('heading', { name: 'Better, together.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join a lesson', exact: true })).toHaveAttribute(
      'href',
      '#/learn/notation',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const start = page.getByRole('link', { name: 'Find my starting point' });
    await start.focus();
    await expect(start).toBeFocused();
    await page.screenshot({
      path: `test-results/club-home-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
test('club home and deep lesson reload preserve their entry and shared player', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await expect(page.getByRole('link', { name: 'Webb Cubing Club home' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'club');
  await page.goto('club/#/learn/white-cross');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.locator('twisty-player').evaluate(async (p: any) => {
    const vantages = await p.experimentalCurrentVantages();
    await Promise.all(
      [...vantages].map(
        (v) =>
          new Promise<void>((resolve) => {
            v.experimentalNextRenderFinishedCallback(resolve);
            v.scheduleRender();
          }),
      ),
    );
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Build the white cross', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.locator('twisty-player').evaluate(async (p: any) => {
    const vantages = await p.experimentalCurrentVantages();
    await Promise.all(
      [...vantages].map(
        (v) =>
          new Promise<void>((resolve) => {
            v.experimentalNextRenderFinishedCallback(resolve);
            v.scheduleRender();
          }),
      ),
    );
  });
  await expect(page).toHaveURL(/\/club\/#\/learn\/white-cross$/);
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'global');
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
