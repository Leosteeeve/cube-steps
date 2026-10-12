import { test, expect } from '@playwright/test';
import { GUIDED_SCRAMBLE } from '../src/content/lbl-course';
import { renderedColors, matchesBoundary } from './helpers/color-entry';

for (const entry of ['lesson', 'scramble']) {
  test(`${entry} shows a complete yellow-center daisy before lowering four matched petals`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(entry === 'lesson' ? '#/learn/white-cross' : '#/solve');
    if (entry === 'scramble') {
      await page.getByLabel('Scramble sequence').fill(GUIDED_SCRAMBLE);
      await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
    }
    const next = page.getByRole('button', { name: 'Next move', exact: true });
    await expect(next).toBeEnabled();
    const build = page.getByRole('heading', { name: '1 · Build the daisy', exact: true });
    const lower = page.getByRole('heading', {
      name: '2 · Match and lower each petal',
      exact: true,
    });
    await expect(build).toBeVisible();
    for (let step = 0; step < 60 && !(await lower.isVisible()); step++) {
      await next.click();
      await expect.poll(() => matchesBoundary(page)).toBe(true);
    }
    await expect(lower).toBeVisible();
    const flower = await renderedColors(page);
    expect(flower.U[4]).toBe('yellow');
    expect([1, 3, 5, 7].map((index) => flower.U[index])).toEqual(Array(4).fill('white'));
    if (entry === 'lesson') {
      await page.getByLabel('Highlight target pieces').uncheck();
      await page.screenshot({
        path: `test-results/daisy-${testInfo.project.name}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
    let lowered = 0;
    for (let step = 0; step < 40 && (await lower.isVisible()); step++) {
      const before = await renderedColors(page);
      await next.click();
      await expect.poll(() => matchesBoundary(page)).toBe(true);
      const after = await renderedColors(page);
      const beforeCount = [1, 3, 5, 7].filter((index) => before.U[index] === 'white').length;
      const afterCount = [1, 3, 5, 7].filter((index) => after.U[index] === 'white').length;
      if (afterCount < beforeCount) {
        expect(beforeCount - afterCount).toBe(1);
        expect(before.F[1]).toBe(before.F[4]);
        expect(after.F[7]).toBe(after.F[4]);
        expect(after.D[1]).toBe('white');
        lowered++;
      }
    }
    expect(lowered).toBe(4);
    const cross = await renderedColors(page);
    expect(cross.D[4]).toBe('white');
    expect([1, 3, 5, 7].map((index) => cross.D[index])).toEqual(Array(4).fill('white'));
    for (const face of ['F', 'R', 'B', 'L']) expect(cross[face][7]).toBe(cross[face][4]);
    expect(errors).toEqual([]);
  });
}
