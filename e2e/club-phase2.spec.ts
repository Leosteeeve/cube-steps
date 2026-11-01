import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';

test('developing solvers can open both teaching paths and resume their lesson', async ({
  page,
}) => {
  await page.goto('club/');
  await dismissTutorialForTest(page);
  const paths = page.getByRole('region', { name: 'Start where you are.' });
  await paths.getByRole('link', { name: 'Learn CFOP', exact: true }).click();
  await expect(page).toHaveURL(/#\/learn\/cfop\/intro$/);
  await expect(page.locator('main h1')).toBeVisible();
  const practiced = page.getByRole('checkbox', { name: 'Mark as practiced' });
  await practiced.check();
  await page.getByRole('link', { name: 'Webb Cubing Club home' }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Resume learning', exact: true }).click();
  await expect(page).toHaveURL(/#\/learn\/cfop\/intro$/);
  await expect(practiced).toBeChecked();
  await page.getByRole('link', { name: 'Webb Cubing Club home' }).click();
  await paths.getByRole('link', { name: 'Learn Roux', exact: true }).click();
  await expect(page).toHaveURL(/#\/learn\/roux\/intro$/);
  await expect(page.locator('main h1')).toBeVisible();
});

test('practice destinations do not also mark Learn as the current navigation section', async ({
  page,
}) => {
  await page.goto('club/');
  await dismissTutorialForTest(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const route of ['algorithms', 'algorithms/oll-01', 'practice', 'cmll', 'cmll-practice']) {
    await page.goto(`club/#/${route}`);
    await expect(nav.getByRole('button', { name: 'Practice', exact: true })).toHaveAttribute(
      'data-current',
      'true',
    );
    await expect(nav.getByRole('link', { name: 'Learn', exact: true })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  }
  await page.goto('club/#/learn/roux/intro');
  await expect(nav.getByRole('link', { name: 'Learn', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('button', { name: 'Practice', exact: true })).not.toHaveAttribute(
    'data-current',
    'true',
  );
});

test('advanced practice and experimental analysis remain separate keyboard destinations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  const paths = page.getByRole('region', { name: 'Start where you are.' });
  const practice = paths.getByRole('link', { name: 'Recognition practice', exact: true });
  await practice.focus();
  await practice.press('Enter');
  await expect(page).toHaveURL(/#\/practice$/);
  await page.goBack();
  await paths.getByRole('link', { name: 'CMLL practice', exact: true }).click();
  await expect(page).toHaveURL(/#\/cmll-practice$/);
  await page.goBack();
  await expect(paths.getByText('Experimental', { exact: true })).toBeVisible();
  await paths.getByRole('link', { name: 'Roux Lab', exact: true }).click();
  await expect(page).toHaveURL(/#\/roux-lab$/);
  await expect(page.locator('main h1')).toBeVisible();
});

test('home tour still reaches the relocated first-solve action', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Learn the letters' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Build one skill at a time' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start with the basics', exact: true }),
  ).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toBeFocused();
});

test.describe('narrow touch navigation', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 800 } });
  test('path links and dropdown choices stay reachable with generous touch targets', async ({
    page,
  }) => {
    await page.goto('club/');
    await dismissTutorialForTest(page);
    const links = page.getByRole('region', { name: 'Start where you are.' }).getByRole('link');
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('button', { name: 'Practice', exact: true }).tap();
    await expect(
      nav.getByRole('link', { name: 'Recognition practice', exact: true }),
    ).toBeInViewport();
    await nav.getByRole('link', { name: 'Timer', exact: true }).tap();
    await expect(page).toHaveURL(/#\/timer$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});

// CSS zoom stresses content reflow; it is not a substitute for native browser zoom review.
test('homepage actions and menus reflow with content enlarged to 200 percent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(
    nav.getByRole('link', { name: 'Recognition practice', exact: true }),
  ).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(nav.getByRole('button', { name: 'Practice', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(nav.getByRole('button', { name: 'Practice', exact: true })).toBeFocused();
  const roux = page
    .getByRole('region', { name: 'Start where you are.' })
    .getByRole('link', { name: 'Learn Roux', exact: true });
  await roux.focus();
  await expect(roux).toBeInViewport();
  await page.screenshot({ path: 'test-results/phase2-css-zoom.png', fullPage: true });
  await roux.press('Enter');
  await expect(page).toHaveURL(/#\/learn\/roux\/intro$/);
});
