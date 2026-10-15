import { test, expect, type Page } from '@playwright/test';
async function matches(page: Page) {
  return page.evaluate(async () => {
    const p = document.querySelector('twisty-player') as any;
    if (!p) return false;
    const expected = JSON.parse(
      document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')!,
    );
    const url = '/cube-steps/src/core/observations.ts';
    const { observeState } = await import(/* @vite-ignore */ url);
    const holding = observeState({ data: expected }).centers,
      label = document.querySelector('[aria-label="Current holding"]')!;
    return (
      JSON.stringify((await p.experimentalModel.currentPattern.get()).patternData) ===
        JSON.stringify(expected) &&
      label.getAttribute('data-front-color') === holding.F &&
      label.getAttribute('data-up-color') === holding.U
    );
  });
}
for (const width of [1440, 390])
  test(
    'Lab physical state, formula replay and trial endpoint at ' + width,
    async ({ page }, info) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/lab-player-harness', (r) =>
        r.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/cube-steps/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script><script type="module" src="/cube-steps/e2e/harnesses/lab-player.tsx"></script></body></html>',
        }),
      );
      await page.goto('lab-player-harness');
      await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
        timeout: 20000,
      });
      await expect(page.getByText(/CFOP Lab · red bottom/)).toBeVisible();
      const fixture = await page.evaluate(() => (window as any).labFixture);
      const boundaries = new Set<number>([
        0,
        fixture.boundaries.crossStart,
        fixture.boundaries.crossEnd,
        fixture.boundaries.f2lEnd,
        fixture.moves.length,
      ]);
      fixture.moves.forEach((m: string, i: number) => {
        if (/^[xyz]|w|^[MES]/.test(m)) {
          boundaries.add(i);
          boundaries.add(i + 1);
        }
      });
      const slider = page.getByLabel('Move position');
      for (const boundary of boundaries) {
        await slider.fill(String(boundary));
        await expect.poll(() => matches(page)).toBe(true);
        if (boundary > 0) {
          await page.getByRole('button', { name: 'Previous move', exact: true }).click();
          await expect.poll(() => matches(page)).toBe(true);
          await page.getByRole('button', { name: 'Next move', exact: true }).click();
          await expect.poll(() => matches(page)).toBe(true);
        }
      }
      await page.getByLabel('Route section').selectOption('lab-oll');
      await expect(slider).toHaveValue(String(fixture.boundaries.f2lEnd));
      await expect(page.getByText(/Cross \+ F2L complete/)).toBeVisible();
      const formula = fixture.actions.find((a: any) => a.action.kind === 'algorithm');
      await slider.fill(String(formula.start));
      await page.getByLabel('Playback speed').selectOption('2');
      await page.getByRole('button', { name: /Replay formula/ }).click();
      await expect(slider).toHaveValue(String(formula.end), { timeout: 20000 });
      await expect.poll(() => matches(page)).toBe(true);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: 'test-results/lab-player-' + width + '-' + info.project.name + '.png',
        fullPage: true,
      });
    },
  );
