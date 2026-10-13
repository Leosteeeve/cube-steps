import { expect, test } from '@playwright/test';

for (const method of [
  { route: '#/solve', label: 'LBL' },
  { route: '#/solve/cfop', label: 'Beginner CFOP' },
]) {
  test(`${method.label} keeps a seek made as soon as playback becomes available`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      // Exercise the first available input before a deferred stage effect can run.
      // Using the native setter models a browser slider change, bypassing React's
      // value tracker in the same way as a real keyboard/pointer interaction.
      const observer = new MutationObserver(() => {
        const range = document.querySelector<HTMLInputElement>('[aria-label="Move position"]');
        if (!range || range.disabled || Number(range.max) === 0) return;
        observer.disconnect();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        range.focus();
        setter.call(range, range.max);
        range.dispatchEvent(new Event('input', { bubbles: true }));
      });
      observer.observe(document, { subtree: true, childList: true, attributes: true });
    });
    await page.goto(method.route);
    await page.getByLabel('Scramble sequence').fill("R U2 F' L2 B D'");
    await page.getByRole('button', { name: `Explain with ${method.label}`, exact: true }).click();
    const range = page.getByLabel('Move position');
    await expect(range).toBeEnabled();
    const end = await range.getAttribute('max');
    await expect(range).toHaveValue(end!);
    await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const player = document.querySelector('twisty-player') as any;
          return (await player.experimentalModel.currentPattern.get()).experimentalIsSolved({
            ignorePuzzleOrientation: true,
            ignoreCenterOrientation: true,
          });
        }),
      )
      .toBe(true);
  });
}
