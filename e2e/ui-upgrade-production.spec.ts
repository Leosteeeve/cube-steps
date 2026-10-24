import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { renderLessonFrame } from './helpers/notation';

for (const club of [false, true]) {
  test(`${club ? 'club' : 'global'} built workspace remains usable on narrow and zoomed screens`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, zoom] of [
      [320, 1],
      [390, 1],
      [430, 1],
      [780, 2],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${club ? 'club/' : ''}#/learn/white-cross`);
      await page.reload();
      if (club) await dismissTutorialForTest(page);
      await page.evaluate((z) => {
        document.documentElement.style.zoom = String(z);
      }, zoom);
      const next = page.getByRole('button', { name: 'Next move', exact: true });
      await expect(next).toBeEnabled();
      await renderLessonFrame(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await next.focus();
      await expect(next).toBeInViewport();
      expect(
        await next.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }),
      ).toBe(true);
      const before = await page.getByTestId('move-position').innerText();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('move-position')).not.toHaveText(before);
      await page.screenshot({
        path: `test-results/ui-workspace-${club ? 'club' : 'global'}-${width}-${zoom}-${info.project.name}.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  });
}
