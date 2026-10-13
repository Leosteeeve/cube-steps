import { expect, test } from '@playwright/test';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
import { enterFacelets } from './helpers/color-entry';
test('club questionnaire, practiced lessons and resume survive navigation and reload', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/find-your-route');
  await page.getByRole('button', { name: 'Skip questions' }).click();
  await page.getByRole('button', { name: 'Choose LBL', exact: true }).click();
  await page.getByRole('link', { name: 'Start lesson', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mark as practiced' }).check();
  await page.getByRole('link', { name: 'Start with the white cross' }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect(page.getByText(/daisy/i).first()).toBeAttached();
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
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
      const canvases: HTMLCanvasElement[] = await p.experimentalCurrentCanvases();
      await Promise.all(
        canvases.flatMap((c) => c.getAnimations().map((a) => a.finished.catch(() => {}))),
      );
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/club-learn-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('link', { name: 'Webb Cubing Club home' }).click();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Resume learning' })).toHaveAttribute(
    'href',
    '#/learn/white-cross',
  );
  await page.getByRole('link', { name: 'Resume learning' }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'One turn. A new possibility.' })).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: 'Build the white cross', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Beginner CFOP', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark as practiced' })).not.toBeChecked();
  await page.getByRole('link', { name: 'Advanced CFOP', exact: true }).click();
  await expect(page.locator('.preview-label').first()).toContainText('Preview');
  expect(errors).toEqual([]);
});
test('club tools share real solve, colors, library and practice within the club entry', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/learn/notation');
  await page.getByRole('link', { name: 'Solve your cube', exact: true }).click();
  await page.getByLabel('Scramble sequence').fill('R');
  await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await enterFacelets(page, GOLDEN_CASES[7].facelets);
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.goto('club/#/algorithms');
  await page.getByRole('checkbox', { name: 'Select OLL 20', exact: true }).check();
  await page.getByRole('button', { name: 'Practice selected cases', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'OLL 20', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('button', { name: 'Show solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/\/club\/#\/practice/);
  expect(errors).toEqual([]);
});
