import { test, expect, type Page } from '@playwright/test';
async function correctHolding(page: Page) {
  return page.evaluate(async () => {
    const { observeState } = await import(new URL('src/core/observations.ts', location.href).href);
    const state = JSON.parse(
      document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')!,
    );
    const centers = observeState({ data: state }).centers;
    const label = document.querySelector('[aria-label="Current holding"]')!;
    return (
      label.getAttribute('data-front-color') === centers.F &&
      label.getAttribute('data-up-color') === centers.U
    );
  });
}
for (const width of [1440, 390])
  test('physical holding stays synchronized at ' + width, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('?fixture=player');
    for (const fixture of ['demo-f2l-back', 'demo-f2l-rotation', 'advanced-colors']) {
      await page.getByLabel('Fixture', { exact: true }).selectOption(fixture);
      await expect(
        page.getByText(
          '3 × 3 · ' +
            (fixture === 'advanced-colors'
              ? 'Advanced CFOP'
              : fixture === 'demo-f2l-back'
                ? 'F2L 01'
                : 'F2L 03'),
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      if (fixture === 'advanced-colors')
        await page.getByLabel('Stage', { exact: true }).selectOption('advanced-f2l');
      if (fixture === 'demo-f2l-back') {
        await expect(page.getByLabel('After this regrip')).toBeVisible();
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
          const canvases:HTMLCanvasElement[]=await p.experimentalCurrentCanvases();
          await Promise.all(canvases.flatMap(c=>c.getAnimations().map(a=>a.finished.catch(()=>{}))));
        });
        await page.screenshot({
          path: 'test-results/f2l-regrip-' + width + '-' + info.project.name + '.png',
          fullPage: true,
        });
      }
      if (fixture === 'advanced-colors')
        await expect(page.getByRole('heading', { name: /Pair \d of 4/ })).toBeVisible();
      const slider = page.getByLabel('Move position'),
        start = Number(await slider.inputValue()),
        total = Number(await slider.getAttribute('max'));
      for (let i = start; i < Math.min(total, start + 12); i++) {
        await slider.fill(String(i));
        await expect.poll(() => correctHolding(page)).toBe(true);
        await page.getByRole('button', { name: 'Next move', exact: true }).click();
        await expect.poll(() => correctHolding(page)).toBe(true);
        await page.getByRole('button', { name: 'Previous move', exact: true }).click();
        await expect.poll(() => correctHolding(page)).toBe(true);
      }
      const value = await slider.inputValue(),
        holding = await page.getByLabel('Current holding').textContent();
      const canvas = page.locator('.cube-canvas');
      await canvas.scrollIntoViewIfNeeded();
      const box = (await canvas.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 5 });
      await page.mouse.up();
      await expect(slider).toHaveValue(value);
      await expect(page.getByLabel('Current holding')).toHaveText(holding!);
      await expect.poll(() => correctHolding(page)).toBe(true);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/f2l-holding-' + width + '-' + info.project.name + '.png',
      fullPage: true,
    });
  });
