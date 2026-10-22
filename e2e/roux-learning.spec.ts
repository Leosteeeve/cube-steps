import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { renderLessonFrame } from './helpers/notation';
test('eight Roux chapters, slice foundations and one verified case per chapter', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/learn/roux/intro');
  await dismissTutorialForTest(page);
  await expect(
    page.getByRole('heading', { name: 'Two blocks. Four corners. Six edges.' }),
  ).toBeVisible();
  await expect(page.getByText('LESSON 1 / 8')).toBeVisible();
  for (const name of ['M', 'M′', 'M2']) {
    await page
      .getByRole('group', { name: 'Middle-slice move' })
      .getByRole('button', { name, exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Play move', exact: true }).click();
    await expect(page.locator('.notation-player')).toHaveAttribute('data-progress', '1');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
  }
  const examples = [
    ['intro', 'hold'],
    ['roux-first-block', 'left-front-pair'],
    ['roux-second-block', 'right-rear-pair'],
    ['roux-corner-orientation', 'roux-ocll-27'],
    ['roux-corner-permutation', 'roux-t'],
    ['roux-edge-orientation', 'eo-6'],
    ['roux-left-right-edges', 'lr-one-complete'],
    ['roux-last-four-edges', 'finish-centers'],
  ];
  for (const [chapter, id] of examples) {
    await page.goto('club/#/learn/roux/' + chapter);
    await page.getByLabel('Practice case').selectOption(id);
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
      timeout: 30000,
    });
    await expect(page.locator('p.notice[data-case-id]')).toHaveAttribute('data-case-id', id);
    await expect(
      page.getByRole('heading', { name: 'If something looks wrong', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('club/#/learn/roux/roux-first-block');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await renderLessonFrame(page);
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: test.info().outputPath('roux-lesson-' + width + '.png'),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
test('Roux stays out of global and timer initialization', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));
  for (const route of ['', '#/learn/cfop/intro', 'club/#/timer']) {
    await page.goto(route || './');
    if (route.includes('club')) {
      await dismissTutorialForTest(page);
      await expect(page.getByRole('button', { name: 'Timing surface', exact: true })).toBeEnabled({
        timeout: 30000,
      });
    } else await expect(page.locator('main h1')).toBeVisible();
  }
  expect(
    requested.filter((u) =>
      // Rolldown names shared cubing.js chunks after all their importers, including Roux.
      // Match dedicated Roux entry chunks, not an importer name embedded in a shared name.
      /\/roux\/|\/(?:RouxFeaturePage|RouxHoldingGuide|RouxLessonDetails|definition|roux-course)[.-]|block-policies|lse-policies/.test(
        u,
      ),
    ),
  ).toEqual([]);
  for (const route of ['#/learn/roux/intro', '#/solve/roux']) {
    await page.goto('./' + route);
    await expect(page.getByRole('heading', { name: /Page not found/i })).toBeVisible();
  }
});
