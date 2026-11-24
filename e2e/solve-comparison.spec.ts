import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { renderedColors } from './helpers/color-entry';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';

test('one starting cube has two playable routes and retains the teaching playhead', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 375, height: 830 });
  await page.goto('club/#/solve');
  await dismissTutorialForTest(page);
  await page.getByLabel('Scramble sequence').fill('R U');
  await page.getByRole('button', { name: 'Explain with LBL' }).click();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  const original = await page.getByTestId('move-position').textContent();
  await page.getByRole('button', { name: 'Compare CFOP and Roux' }).click();
  const panel = page.getByRole('region', { name: 'Method comparison' });
  const turnCounts: number[] = [];
  for (const label of ['Advanced CFOP', 'Advanced Roux']) {
    const route = panel.getByRole('article', { name: label });
    const view = route.getByRole('button', { name: 'View ' + label + ' steps' });
    await expect(view).toBeVisible({ timeout: 40000 });
    const turns = Number(await route.locator('dd').nth(0).textContent());
    turnCounts.push(turns);
    const total = turns + Number(await route.locator('dd').nth(2).textContent());
    await view.click();
    await expect(page.getByText('3 × 3 · ' + label, { exact: true })).toBeVisible();
    const position = page.getByRole('slider', { name: 'Move position' });
    await expect(position).toHaveAttribute('max', String(total));
    await expect(position).toBeEnabled();
    await expect(page.getByRole('region', { name: 'Cube player' })).toHaveCount(1);
    await position.fill(String(total));
    await expect(page.getByRole('heading', { name: 'Cube solved.' })).toBeVisible();
    await view.click();
    await expect(position).toHaveValue(String(total));
    await expect(page.locator('.stage-nav .active')).toContainText(
      label === 'Advanced CFOP' ? 'alignment' : 'last four',
    );
    await page.getByRole('button', { name: 'Back to my solution' }).click();
    await expect(page.getByTestId('move-position')).toHaveText(original!);
  }
  await expect(panel.getByText(/white bottom.*blue left/i)).toBeVisible();
  const [cfop, roux] = turnCounts;
  const difference = Math.abs(cfop - roux);
  const expected = difference
    ? `${cfop < roux ? 'Advanced CFOP' : 'Advanced Roux'} uses ${difference} fewer ${difference === 1 ? 'turn' : 'turns'} on this cube.`
    : 'Both routes use the same number of turns.';
  await expect(panel.getByText(expected, { exact: true })).toBeVisible();
  await panel.screenshot({ path: testInfo.outputPath('comparison-375.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  await panel.screenshot({ path: testInfo.outputPath('comparison-desktop.png') });
  await page.setViewportSize({ width: 320, height: 770 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(errors).toEqual([]);
});

test('both method players start from the verified color grid', async ({ page }) => {
  test.setTimeout(90000);
  const facelets = GOLDEN_CASES[1].facelets;
  await page.addInitScript((facelets) => {
    sessionStorage.setItem(
      'cubesteps.club.color-draft.v1',
      JSON.stringify({
        version: 1,
        draft: { facelets, face: 'F', selection: 'white' },
      }),
    );
  }, facelets);
  await page.goto('club/#/solve');
  await dismissTutorialForTest(page);
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with LBL' }).click();
  await page.getByRole('button', { name: 'Compare CFOP and Roux' }).click();
  for (const method of ['Advanced CFOP', 'Advanced Roux']) {
    await page.getByRole('button', { name: 'View ' + method + ' steps' }).click({ timeout: 40000 });
    const slider = page.getByRole('slider', { name: 'Move position' });
    await expect(slider).toBeEnabled();
    await expect(slider).toHaveValue('0');
    await expect.poll(() => renderedColors(page)).toEqual(facelets);
  }
  await page.getByRole('button', { name: 'Close comparison' }).click();
  await expect(page.getByText('3 × 3 · LBL', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare CFOP and Roux' })).toBeFocused();
});
