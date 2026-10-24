import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
for (const width of [1440, 390])
  test(`Roux A/B snapshots and shared player stay fixed at ${width}px`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('club/');
    await dismissTutorialForTest(page);
    await page.goto('club/#/roux-lab');
    await page.getByLabel('Scramble sequence').fill("D2 F' R' D");
    await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
    const cards = page.getByRole('region', { name: 'Roux routes' }).locator('[data-roux-route]');
    await expect.poll(() => cards.count(), { timeout: 35000 }).toBeGreaterThanOrEqual(2);
    // Resolve the currently available cards at click time: search may replace an
    // unpinned candidate between a DOM read and the subsequent click.
    await cards.getByRole('button', { name: 'Compare this route', exact: true }).first().click();
    await cards.getByRole('button', { name: 'Compare this route', exact: true }).first().click();
    await page
      .getByRole('navigation', { name: 'Roux Lab workspace' })
      .getByRole('link', { name: 'Compare', exact: true })
      .click();
    const comparison = page.getByRole('region', { name: 'Fixed Roux comparison' });
    const a = await comparison.locator('[data-roux-route]').nth(0).getAttribute('data-roux-route'),
      b = await comparison.locator('[data-roux-route]').nth(1).getAttribute('data-roux-route');
    expect(a).not.toBe(b);
    await comparison
      .locator(`[data-roux-route="${a}"]`)
      .getByRole('button', { name: 'Play full solve' })
      .click();
    await expect(page.getByRole('region', { name: 'Selected Roux route' })).toHaveAttribute(
      'data-selected-route',
      a!,
    );
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await page
      .getByRole('navigation', { name: 'Roux Lab workspace' })
      .getByRole('link', { name: 'Analyze', exact: true })
      .click();
    await page
      .getByRole('navigation', { name: 'Roux Lab workspace' })
      .getByRole('link', { name: 'Compare', exact: true })
      .click();
    await expect(comparison.locator(`[data-roux-route="${a}"]`)).toBeVisible();
    await expect(comparison.locator(`[data-roux-route="${b}"]`)).toBeVisible();
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await expect(page.locator('[data-roux-phase]')).toHaveAttribute(
      'data-roux-phase',
      /complete|stopped/,
      { timeout: 35000 },
    );
    await expect(comparison.locator(`[data-roux-route="${a}"]`)).toBeVisible();
    await comparison
      .locator(`[data-roux-route="${b}"]`)
      .getByRole('button', { name: 'Play full solve' })
      .click();
    await expect(page.getByLabel('Move position')).toHaveValue('0');
    await expect(page.getByRole('region', { name: 'Selected Roux route' })).toHaveAttribute(
      'data-selected-route',
      b!,
    );
    await page.getByLabel('Route section', { exact: true }).selectOption('ar-cmll');
    await expect(page.getByText(/Both blocks complete — the trial endpoint/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('twisty-player').scrollIntoViewIfNeeded();
    await page.locator('twisty-player').evaluate(async (p: any) => {
      await p.experimentalCurrentThreeJSPuzzleObject();
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    });
    await page.screenshot({
      path: `test-results/roux-compare-${width}-${info.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page
      .getByRole('navigation', { name: 'Roux Lab workspace' })
      .getByRole('link', { name: 'Analyze', exact: true })
      .click();
    await expect(page.getByLabel('Scramble sequence')).toHaveValue("D2 F' R' D");
    expect(errors).toEqual([]);
  });
