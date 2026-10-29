import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';

test('homepage reveal is visible by default, once-only, and stops for keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.evaluate(() => document.fonts.ready);
  const section = page.getByRole('region', { name: 'Start where you are.' });
  expect(await section.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  const entering = await section.evaluate(
    (el) =>
      new Promise<{ opacity: number; transform: string }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('Section never animated on entry')), 2000);
        const sample = () => {
          if (el.getAnimations().length) {
            clearTimeout(timeout);
            const style = getComputedStyle(el);
            resolve({ opacity: Number(style.opacity), transform: style.transform });
          } else requestAnimationFrame(sample);
        };
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        sample();
      }),
  );
  expect(entering.opacity).toBeGreaterThanOrEqual(0.6);
  expect(entering.transform).not.toBe('none');
  await section.getByRole('link').first().focus();
  expect(
    await section.evaluate((el) => ({
      opacity: getComputedStyle(el).opacity,
      transform: getComputedStyle(el).transform,
      animations: el.getAnimations().length,
    })),
  ).toEqual({ opacity: '1', transform: 'none', animations: 0 });
  await page.locator('h1').scrollIntoViewIfNeeded();
  await section.scrollIntoViewIfNeeded();
  expect(await section.evaluate((el) => el.getAnimations().length)).toBe(0);
});

for (const mode of ['reduced', 'off', 'no-observer'] as const) {
  test(`homepage content and links remain usable with ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
    if (mode === 'no-observer')
      await page.addInitScript(() =>
        Object.defineProperty(window, 'IntersectionObserver', { value: undefined }),
      );
    await page.goto('club/');
    await dismissTutorialForTest(page);
    if (mode === 'off') await page.getByLabel('Decorative motion').selectOption('off');
    const section = page.getByRole('region', { name: 'Start where you are.' });
    await section.scrollIntoViewIfNeeded();
    expect(
      await section.evaluate((el) => ({
        opacity: getComputedStyle(el).opacity,
        animations: el.getAnimations().length,
      })),
    ).toEqual({ opacity: '1', animations: 0 });
    await section.getByRole('link', { name: /Not sure/ }).click();
    await expect(page).toHaveURL(/#\/find-your-route$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
