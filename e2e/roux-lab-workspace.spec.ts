import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
for (const width of [1440, 390])
  test(`Roux Lab keeps selected playback stable and fits ${width}px`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('club/');
    await dismissTutorialForTest(page);
    await page.goto('club/#/roux-lab');
    await expect(page.getByRole('heading', { name: 'Build less. Connect better.' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Learning tools' })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(8);
    await page.getByLabel('Scramble sequence').fill("D2 F' R' D");
    await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
    const player = page.getByRole('region', { name: 'Selected Roux route' });
    await expect(player).toBeVisible({ timeout: 35000 });
    const id = await player.getAttribute('data-selected-route');
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await expect(page.locator('[data-roux-phase]')).toHaveAttribute(
      'data-roux-phase',
      /complete|stopped/,
      { timeout: 35000 },
    );
    await expect(player).toHaveAttribute('data-selected-route', id!);
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await page.getByText('Actual search coverage and proof scope', { exact: true }).click();
    await expect(page.getByRole('region', { name: 'Search coverage' })).toContainText(
      /lower bound|minimum|Not explored/,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('twisty-player').scrollIntoViewIfNeeded();
    await page.locator('twisty-player').evaluate(async (p: any) => {
      await p.experimentalCurrentThreeJSPuzzleObject();
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    });
    await page.screenshot({
      path: `test-results/roux-lab-${width}-${info.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByLabel('Move position').focus();
    await page.keyboard.press('End');
    await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
    await page.getByLabel('Scramble sequence').fill('R ?');
    await expect(player).toHaveCount(0);
    await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('character 3');
    await page.getByRole('button', { name: 'White / blue only' }).click();
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(1);
    await expect(page.getByLabel('white bottom · blue left', { exact: true })).toBeDisabled();
    await page.reload();
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(1);
    expect(errors).toEqual([]);
  });
test('global navigation stays free of Roux Lab modules and old CFOP Lab still opens', async ({
  page,
}) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('./');
  await expect(page.getByRole('heading').first()).toBeVisible();
  expect(urls.filter((u) => /roux-lab|methods\/roux-advanced/.test(u))).toEqual([]);
  await expect(page.getByRole('link', { name: 'Roux Test Lab' })).toHaveCount(0);
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/lab');
  await expect(page.getByText('CFOP Lab · Experimental', { exact: true })).toBeVisible();
});
