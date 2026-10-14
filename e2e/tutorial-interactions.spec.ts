import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { renderNotationFrame, selectNotation } from './helpers/notation';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
import { enterFacelets } from './helpers/color-entry';
async function next(page: import('@playwright/test').Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
}
async function renderLessonFrame(page: import('@playwright/test').Page) {
  await page.locator('twisty-player').evaluate(async (player: any) => {
    for (const vantage of await player.experimentalCurrentVantages()) await vantage.render();
    const canvases: HTMLCanvasElement[] = await player.experimentalCurrentCanvases();
    await Promise.all(
      canvases.flatMap((c) => c.getAnimations().map((a) => a.finished.catch(() => {}))),
    );
  });
}
test('Moves requires real U prime actions then restores selection, view and speed', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  await renderNotationFrame(page);
  await selectNotation(page, 'R2');
  await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
  await renderNotationFrame(page);
  await page.getByLabel('Move speed').selectOption('0.5');
  await page.getByRole('button', { name: 'Direction view', exact: true }).click();
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  await page.waitForFunction(
    () => Number(document.querySelector('.notation-player')?.getAttribute('data-progress')) > 0.1,
  );
  await page.getByRole('button', { name: 'Pause move', exact: true }).click();
  const originalProgress = await page.locator('.notation-player').getAttribute('data-progress');
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await next(page);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'U, Up face', exact: true }).click();
  await next(page);
  await page.getByRole('button', { name: /U prime/ }).click();
  await next(page);
  await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
  await renderNotationFrame(page);
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole('dialog', { name: 'Watch U prime' })).toBeVisible();
  await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'complete');
  await page.getByRole('button', { name: 'Exit tour' }).click();
  await expect(page.getByLabel('Selected move')).toHaveText('R2');
  await expect(page.locator('.notation-player')).toHaveAttribute(
    'data-progress',
    originalProgress!,
  );
  await expect(page.getByLabel('Move speed')).toHaveValue('0.5');
  await expect(page.getByRole('button', { name: 'Direction view', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await renderNotationFrame(page);
  expect(errors).toEqual([]);
});
for (const route of [
  'learn/notation',
  'learn/cfop/intro',
  'learn/advanced-cfop/intro',
  'learn/white-cross',
  'learn/cfop/cfop-f2l',
  'learn/advanced-cfop/advanced-f2l',
]) {
  test(`lesson tour preserves practice and restores playback: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('club/#/' + route);
    await dismissTutorialForTest(page);
    const playable = !route.endsWith('/intro') && !route.endsWith('/notation');
    if (playable) {
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await renderLessonFrame(page);
    }
    const before = await page.evaluate(() => localStorage.getItem('cubesteps.club.progress.v1'));
    const original = playable
      ? await page.getByLabel('Move position', { exact: true }).inputValue()
      : null;
    await page.getByRole('button', { name: 'Page tour', exact: true }).click();
    await next(page);
    await next(page);
    if (playable) {
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }),
      ).toBeEnabled();
    }
    await page.getByRole('button', { name: 'Exit tour' }).click();
    if (playable) {
      await expect(page.getByLabel('Move position', { exact: true })).toHaveValue(original!);
      await renderLessonFrame(page);
    }
    expect(await page.evaluate(() => localStorage.getItem('cubesteps.club.progress.v1'))).toBe(
      before,
    );
    await expect(page.getByRole('checkbox', { name: 'Mark as practiced' })).not.toBeChecked();
    expect(errors).toEqual([]);
  });
}
test('static and failed renderers allow skipping; global pages remain unchanged', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Skip step' }).click();
  await expect(page.getByText(/This control is not available/)).toBeVisible({ timeout: 7000 });
  await page.getByRole('button', { name: 'Exit tour' }).click();
  await expect(page.getByRole('img', { name: 'Before U', exact: true })).toBeVisible();
  await page.goto('#/learn/notation');
  await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toHaveCount(0);
});
test('read-only solve tour preserves a partially colored invalid draft and never submits it', async ({
  page,
}) => {
  await page.goto('club/#/solve');
  await dismissTutorialForTest(page);
  await enterFacelets(page, GOLDEN_CASES[7].facelets);
  await page.getByRole('button', { name: 'Eraser', exact: true }).click();
  await page.getByRole('button', { name: /^Down, row 1, column 1,/ }).click();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  const before = await page.evaluate(() => sessionStorage.getItem('cubesteps.club.color-draft.v1'));
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await expect(page.locator('[data-guidance="solve.input"]')).toBeVisible();
  await next(page);
  await expect(page.locator('[data-guidance="solve.validation"]')).toBeVisible();
  await next(page);
  await expect(page.locator('[data-guidance="solve.explanation"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Exit tour' }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('cubesteps.club.color-draft.v1'))).toBe(
    before,
  );
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toHaveCount(0);
});
test('read-only formula tours preserve selected scope and keep the exercise hidden', async ({
  page,
}) => {
  await page.goto('club/#/algorithms');
  await dismissTutorialForTest(page);
  await page.getByLabel('Search cases').fill('OLL 20');
  await page.getByRole('checkbox', { name: 'Select OLL 20', exact: true }).check();
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await next(page);
  await expect(page.locator('[data-guidance="algorithms.case"]')).toBeVisible();
  await page.getByRole('button', { name: 'Exit tour' }).click();
  await expect(page.getByLabel('Search cases')).toHaveValue('OLL 20');
  await expect(page.getByRole('checkbox', { name: 'Select OLL 20', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Practice selected cases', exact: true }).click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem('cubesteps.club.practice-selection.v1'),
  );
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await next(page);
  await next(page);
  await page.getByRole('button', { name: 'Exit tour' }).click();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeVisible();
  await expect(page.locator('.practice-answer')).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('cubesteps.club.practice-selection.v1')),
  ).toBe(before);
});
