import { test, expect } from '@playwright/test';
import { seededScramble } from '../tests/fixtures/lbl-cases';
import { dismissTutorialForTest } from './helpers/tutorial';
import { matchesBoundary } from './helpers/color-entry';

for (const [method, seed, route] of [
  ['Beginner CFOP', 4, '#/solve/cfop'],
  ['Advanced CFOP', 1, '#/solve/advanced-cfop'],
  ['Beginner Roux', 1, 'club/#/solve/roux'],
] as const) {
  test(`${method} connected moves match the real cube during single-step and replay`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(route);
    if (route.startsWith('club/')) await dismissTutorialForTest(page);
    await page.getByLabel('Scramble sequence').fill(seededScramble(seed).join(' '));
    await page.getByRole('button', { name: `Explain with ${method}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    for (let i = 0; i < 100; i++) {
      if (await page.getByRole('heading', { name: 'Connect the moves', exact: true }).isVisible())
        break;
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
    }
    await expect(
      page.getByRole('heading', { name: 'Connect the moves', exact: true }),
    ).toBeVisible();
    const card = page.locator('.algorithm-card'),
      start = Number(await card.getAttribute('data-action-start')),
      end = Number(await card.getAttribute('data-action-end'));
    await page.getByText('Why these steps are connected', { exact: true }).click();
    await expect(page.getByText(/Reference only.*do not perform these again/)).toBeVisible();
    for (let i = start; i < end; i++) {
      await expect.poll(() => matchesBoundary(page)).toBe(true);
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Previous move', exact: true }).click();
    await expect.poll(() => matchesBoundary(page)).toBe(true);
    await page.getByLabel('Playback speed').selectOption('2');
    await page.getByRole('button', { name: /Replay connected moves/ }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByLabel('Move position')).toHaveValue(String(end));
    await expect.poll(() => matchesBoundary(page)).toBe(true);
    await page.getByRole('button', { name: 'Previous move', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({
      path: `test-results/connected-${method.replaceAll(' ', '-')}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByLabel('Move position').focus();
    await page.keyboard.press('End');
    await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
    await expect.poll(() => matchesBoundary(page)).toBe(true);
    expect(errors).toEqual([]);
  });
}
