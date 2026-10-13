import { test, expect } from '@playwright/test';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
const lessons = [
  'intro',
  'advanced-cross',
  'advanced-f2l',
  'advanced-oll',
  'advanced-pll',
  'advanced-auf',
];
const examples: Record<string, string> = {
  'advanced-cross': 'shortest-cross',
  'advanced-f2l': 'f2l-41',
  'advanced-oll': 'oll-20',
  'advanced-pll': 'pll-z',
  'advanced-auf': 'auf',
};
for (const width of [1440, 390])
  test('opens six Advanced lessons and verified examples at ' + width, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const id of lessons) {
      await page.goto('#/learn/advanced-cfop/' + id);
      await expect(page.locator('.preview-label')).toHaveText('Advanced CFOP · Preview');
      await expect(page.locator('.preview-label')).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: 'Learning path' }).getByRole('link'),
      ).toHaveCount(6);
      if (id === 'intro') {
        await expect(
          page.getByRole('heading', { name: 'Wide turns, slice turns and AUF.' }),
        ).toBeVisible();
        await expect(page.getByText(/physical acceptance pending/)).toBeVisible();
      } else {
        await expect(page.locator('.lesson-heading .eyebrow')).toHaveText(
          'LESSON ' + lessons.indexOf(id) + ' / 5',
        );
        await page.getByLabel('Practice case', { exact: true }).selectOption(examples[id]);
        await expect(
          page.locator('.algorithm-card[data-case-id="' + examples[id] + '"]'),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        id,
      ).toBe(true);
      if (id === 'advanced-oll') {
        await page.locator('twisty-player').scrollIntoViewIfNeeded();
        await page.evaluate(async () => {
          const player = document.querySelector('twisty-player') as any;
          await player.experimentalCurrentThreeJSPuzzleObject();
          await player.experimentalCurrentCanvases();
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        });
        await page.screenshot({
          path: 'test-results/advanced-course-' + width + '-' + info.project.name + '.png',
          fullPage: true,
        });
      }
    }
    await page.reload();
    await expect(page.locator('.lesson-heading h1')).toHaveText('Finish with one clear alignment.');
    expect(errors).toEqual([]);
  });
test('three-method history preserves draft and starts only explicit solves', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/solve');
  await page.getByLabel('Scramble sequence').fill('R U F2');
  await page.getByRole('button', { name: 'Explain with LBL' }).click();
  await expect(page.getByText('Verified LBL solution')).toBeVisible();
  const methods = page.getByRole('navigation', { name: 'Teaching method' });
  await methods.getByRole('link', { name: 'Beginner CFOP', exact: true }).click();
  await methods.getByRole('link', { name: 'Advanced CFOP', exact: true }).click();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  await expect(page.locator('.solution-summary')).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Solution stages' }).getByRole('button'),
  ).toHaveCount(5);
  await page.getByRole('button', { name: 'Explain with Advanced CFOP' }).click();
  await expect(page.getByText('Verified Advanced CFOP solution')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/solve\/cfop$/);
  await expect(page.locator('.solution-summary')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/solve$/);
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2');
  await page.goForward();
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Explain with Advanced CFOP' })).toBeEnabled();
  expect(errors).toEqual([]);
});
test('mobile checked colors, selected face and undo survive all three methods', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    (facelets) =>
      sessionStorage.setItem(
        'cubesteps.color-draft.v1',
        JSON.stringify({ version: 1, draft: { facelets, face: 'F', selection: 'white' } }),
      ),
    GOLDEN_CASES[7].facelets,
  );
  await page.goto('#/solve');
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  const methods = page.getByRole('navigation', { name: 'Teaching method' });
  for (const label of ['Beginner CFOP', 'Advanced CFOP']) {
    const link = methods.getByRole('link', { name: label, exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Explain with ' + label })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Front face', exact: true })).toHaveAttribute(
      'aria-current',
      'step',
    );
  }
  await page.getByRole('button', { name: 'Eraser', exact: true }).click();
  await page.getByRole('button', { name: /^Front, row 1, column 1,/ }).click();
  await methods.getByRole('link', { name: 'LBL', exact: true }).click();
  await expect(page.getByText('47 / 48 stickers entered')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('48 / 48 stickers entered')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/advanced-switch-' + info.project.name + '-mobile.png',
    fullPage: true,
  });
});
test('unknown method paths show an explicit fallback', async ({ page }) => {
  for (const path of ['#/solve/roux', '#/learn/advanced-cfop/missing']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Learning path' })).toHaveCount(0);
  }
  await page.getByRole('link', { name: 'Learn Advanced CFOP', exact: true }).click();
  await expect(page.locator('.preview-label')).toHaveText('Advanced CFOP · Preview');
});
