import { test, expect } from '@playwright/test';
import { CFOP_COURSE } from '../src/content/cfop-course';
import { matchesBoundary } from './helpers/color-entry';
test('opens the full CFOP course and every verified case selector', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/learn/cfop/intro');
  await expect(
    page.getByRole('heading', { name: 'Think in pairs. Solve in four phases.', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Physical-cube CFOP teaching acceptance is still pending/),
  ).toBeVisible();
  for (const lesson of CFOP_COURSE.filter((l) => l.stageId)) {
    await page.locator(`.stage-nav a[href="#/learn/cfop/${lesson.id}"]`).click();
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await expect.poll(() => matchesBoundary(page)).toBe(true);
    for (const example of lesson.examples ?? []) {
      await page.getByLabel('Practice case').selectOption(example.id);
      await expect(
        page.locator(`.algorithm-card[data-case-id="${example.expectedCaseId}"]`),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await expect.poll(() => matchesBoundary(page)).toBe(true);
      await expect(page.locator('.piece-label').first()).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
test('mobile CFOP lessons handle rapid case changes, M notation and keyboard stepping', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/learn/cfop/cfop-pll-edges');
  for (const id of ['pll-h', 'pll-z', 'pll-ua', 'pll-h'])
    await page.getByLabel('Practice case').selectOption(id);
  await expect(page.locator('.algorithm-card[data-case-id="pll-h"]')).toBeVisible();
  const next = page.getByRole('button', { name: 'Next move', exact: true });
  await expect(next).toBeEnabled();
  for (
    let i = 0;
    i < 3 && (await page.locator('.algorithm-card[data-algorithm-id="pll-h"]').count()) === 0;
    i++
  )
    await next.click();
  await expect(page.getByText(/M turns the middle slice/)).toBeVisible();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/cfop-lesson-${info.project.name}-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('#/learn/cfop/cfop-f2l');
  await page.getByLabel('Practice case').selectOption('f2l-connected');
  await expect(page.locator('.algorithm-card[data-case-id="f2l-connected"]')).toBeVisible();
  await expect(next).toBeEnabled();
  await page.screenshot({
    path: `test-results/cfop-f2l-${info.project.name}-desktop.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(next).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Teaching method' })
    .getByRole('link', { name: 'LBL', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
});
