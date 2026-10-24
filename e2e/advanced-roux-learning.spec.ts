import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { matchesBoundary } from './helpers/color-entry';
import { renderLessonFrame } from './helpers/notation';
const ids = [
  'intro',
  'ar-first-block',
  'block-strategies',
  'block-lookahead',
  'ar-second-block',
  'ar-cmll',
  'ar-eolr',
  'starting-block',
  'practice-compare',
];
test('nine chapters play their actual worked cases and retain conceptual progress', async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/');
  await dismissTutorialForTest(page);
  for (const id of ids) {
    await page.goto(`club/#/learn/advanced-roux/${id}`);
    await expect(page.getByRole('combobox', {name:'Worked example'})).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await expect.poll(() => matchesBoundary(page)).toBe(true);
    await page.getByLabel('Move position').focus();
    await page.keyboard.press('End');
    await expect(
      page.getByRole('heading', { name: 'Example complete.', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Mark as practiced').check();
  }
  await page.goto('club/#/learn/advanced-roux/ar-eolr');
  for (const example of ['lse-combined', 'lse-basic']) {
    await page.getByRole('combobox', {name:'Worked example'}).selectOption(example);
    await page.getByRole('button', { name: 'Last four', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Finish the last four edges', exact: true }),
    ).toBeVisible();
    await expect.poll(() => matchesBoundary(page)).toBe(true);
  }
  await page.goto('club/#/learn/advanced-roux/block-strategies');
  await page.reload();
  await expect(page.getByLabel('Mark as practiced')).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await renderLessonFrame(page);
  await page.locator('.cube-stage').screenshot({path:info.outputPath('brighter-cube-phone.png'), animations:'disabled'});
  await page.screenshot({
    path: info.outputPath('advanced-roux-lesson-phone.png'),
    fullPage: true, animations:'disabled',
  });
  await page.getByRole('combobox', {name:'Worked example'}).selectOption('late-base');
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  expect(errors).toEqual([]);
});
test('neutral quiz recommends Roux from explicit foundations and leaves manual choices open', async ({
  page,
}) => {
  await page.goto('club/#/find-your-route');
  await dismissTutorialForTest(page);
  for (const answer of [
    'I can solve with a beginner method',
    'Build small blocks and use the middle slice',
    'Roux: both blocks, corners and basic LSE',
    'Learn advanced formulas and reduce steps',
    'Short sessions',
  ]) {
    await page.getByLabel(answer, { exact: true }).check();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByLabel('Both', { exact: true }).check();
  await page.getByRole('button', { name: 'Show my route', exact: true }).click();
  await expect(page.locator('.club-result-label')).toHaveText('Advanced Roux · Preview');
  await page.getByRole('link', { name: 'Start lesson', exact: true }).click();
  await expect(page.getByRole('combobox', {name:'Worked example'})).toBeVisible();
});
