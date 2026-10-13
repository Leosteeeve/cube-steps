import { test, expect } from '@playwright/test';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
import { enterFacelets, renderedColors, matchesBoundary } from './helpers/color-entry';
for (const width of [1440, 390])
  test(
    'production Advanced solve, library and practice at ' + width,
    async ({ page, request }, info) => {
      test.setTimeout(150000);
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [],
        failures: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => {
        if (r.status() >= 400) failures.push(r.status() + ' ' + r.url());
      });
      const build = await request.get('build-info.json');
      expect(build.ok()).toBe(true);
      const metadata = await build.json();
      expect(metadata.commit).toMatch(/^[a-f0-9]{40}$/);
      if (process.env.CUBESTEPS_EXPECTED_SHA)
        expect(metadata.commit).toBe(process.env.CUBESTEPS_EXPECTED_SHA);
      await page.goto('#/learn/advanced-cfop/intro');
      await expect(page.getByText('Advanced CFOP · Preview', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.locator('.lesson-heading h1')).toHaveText(
        'Plan fewer moves. Recognize the whole case.',
      );
      await page.getByRole('link', { name: 'Solve your cube', exact: true }).click();
      const example = GOLDEN_CASES[7];
      await page.getByLabel('Scramble sequence').fill(example.moves.join(' '));
      await page.getByRole('button', { name: 'Explain with Advanced CFOP', exact: true }).click();
      await expect(page.getByText('Verified Advanced CFOP solution')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await expect.poll(() => renderedColors(page)).toEqual(example.facelets);
      await page.getByLabel('Move position').focus();
      await page.keyboard.press('End');
      await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
      await expect.poll(() => matchesBoundary(page)).toBe(true);
      await enterFacelets(page, example.facelets);
      await page.getByRole('button', { name: 'Check colors', exact: true }).click();
      await page.getByRole('button', { name: 'Explain with Advanced CFOP', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await expect.poll(() => renderedColors(page)).toEqual(example.facelets);
      await page.getByLabel('Move position').focus();
      await page.keyboard.press('End');
      await expect
        .poll(() =>
          page.evaluate(async () => {
            const p = document.querySelector('twisty-player') as any;
            return (await p.experimentalModel.currentPattern.get()).experimentalIsSolved({
              ignorePuzzleOrientation: true,
              ignoreCenterOrientation: true,
            });
          }),
        )
        .toBe(true);
      await page.goto('#/algorithms/f2l-01');
      await expect(
        page.getByRole('combobox', { name: 'Formula variant', exact: true }),
      ).toBeVisible();
      await page.reload();
      await page
        .getByRole('combobox', { name: 'Formula variant', exact: true })
        .selectOption('f2l-01/main/br');
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
      await expect.poll(() => matchesBoundary(page)).toBe(true);
      await page.getByRole('link', { name: 'Algorithms', exact: true }).click();
      await expect(page.locator('.case-tile')).toHaveCount(119);
      await page.getByRole('checkbox', { name: 'Select OLL 20', exact: true }).check();
      await page.getByRole('button', { name: 'Practice selected cases', exact: true }).click();
      await page.getByRole('button', { name: 'Start practice', exact: true }).click();
      const exercise = page.getByRole('region', { name: 'Current exercise' });
      await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeEnabled();
      expect(await exercise.innerHTML()).not.toMatch(/oll-20|OLL 20|twisty-player|algorithm-card/);
      await page.getByRole('button', { name: 'Show solution', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await page.getByLabel('Move position').focus();
      await page.keyboard.press('End');
      await expect(
        page.getByRole('heading', { name: 'Algorithm complete.', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toHaveCount(0);
      await page.locator('twisty-player').scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        const p = document.querySelector('twisty-player') as any;
        await p.experimentalCurrentThreeJSPuzzleObject();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        scrollTo(0, 0);
      });
      await page.screenshot({
        path: 'test-results/advanced-production-' + width + '-' + info.project.name + '.png',
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Next case', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeEnabled();
      await expect(page.locator('twisty-player')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.reload();
      await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
      await expect(exercise).toHaveCount(0);
      expect(errors).toEqual([]);
      expect(failures).toEqual([]);
    },
  );
