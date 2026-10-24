import { expect, test, type Page } from '@playwright/test';
async function netMatches(page: Page) {
  return page.evaluate(async () => {
    const { stateToFacelets } = await import(new URL('src/core/facelets.ts', location.href).href);
    const data = JSON.parse(
      document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')!,
    );
    const expected = stateToFacelets({ data });
    const cells = [...document.querySelectorAll('[data-facelet]')];
    return (
      cells.length === 54 &&
      cells.every((cell) => {
        const key = cell.getAttribute('data-facelet')!;
        return (
          cell.getAttribute('data-color') ===
          expected[key[0] as keyof typeof expected][Number(key.slice(1)) - 1]
        );
      })
    );
  });
}
test('a 2D cube stays synchronized when WebGL cannot initialize', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      if (type === 'webgl2') return null;
      return (original as any).call(this, type, ...args);
    } as any;
  });
  await page.goto('?fixture=player');
  await expect(page.getByRole('img', { name: /Six-face view/ })).toBeVisible();
  await expect.poll(() => netMatches(page)).toBe(true);
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByTestId('move-position')).toContainText('Move 1 of');
  await expect.poll(() => netMatches(page)).toBe(true);
});
test('actual context loss preserves the timeline and provides the current 2D cube', async ({
  page,
}, info) => {
  await page.goto('?fixture=player');
  const next = page.getByRole('button', { name: 'Next move', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  const before = await page.getByTestId('move-position').innerText();
  await page.locator('twisty-player').evaluate(async (p: any) => {
    const canvases = await p.experimentalCurrentCanvases();
    const gl = [...canvases][0].getContext('webgl2');
    if (!gl?.getExtension('WEBGL_lose_context'))
      throw Error('Test browser cannot simulate context loss');
    gl.getExtension('WEBGL_lose_context').loseContext();
  });
  await expect(page.getByRole('alert')).toContainText('3D');
  await expect(page.getByTestId('move-position')).toHaveText(before);
  await expect(page.getByRole('img', { name: /Six-face view/ })).toBeVisible();
  await next.click();
  await expect.poll(() => netMatches(page)).toBe(true);
  await page.screenshot({
    path: `test-results/cube-fallback-${info.project.name}.png`,
    fullPage: true,
  });
});
