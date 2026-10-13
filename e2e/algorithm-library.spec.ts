import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { AlgorithmRegistry } from '../src/algorithms/types';
test.use({ actionTimeout: 5000 });
const catalogs = ['f2l', 'oll', 'pll'].map(
  (f) =>
    JSON.parse(
      readFileSync('src/algorithms/data/' + f + '-catalog.json', 'utf8'),
    ) as AlgorithmRegistry,
);
const registry = {
  cases: Object.assign({}, ...catalogs.map((c) => c.cases)),
  variants: Object.assign({}, ...catalogs.map((c) => c.variants)),
} as AlgorithmRegistry;
test('filters every family and group and retains stable case links', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/algorithms');
  await expect(page.locator('.case-tile')).toHaveCount(119);
  for (const family of ['f2l', 'oll', 'pll']) {
    await page.getByRole('combobox', { name: 'Family', exact: true }).selectOption(family);
    const cases = Object.values(registry.cases).filter((c) => c.family === family);
    await expect(page.locator('.case-tile')).toHaveCount(cases.length);
    for (const group of [...new Set(cases.map((c) => c.group))]) {
      await page.getByRole('combobox', { name: 'Group', exact: true }).selectOption(group);
      await expect(page.locator('.case-tile')).toHaveCount(
        cases.filter((c) => c.group === group).length,
      );
    }
    await page.getByRole('combobox', { name: 'Group', exact: true }).selectOption('all');
  }
  await page.getByLabel('Search cases').fill('pll-z');
  await expect(page.locator('.case-tile')).toHaveCount(1);
  await page
    .getByRole('link', { name: 'Explore ' + registry.cases['pll-z'].label + ' →', exact: true })
    .click();
  await expect(page).toHaveURL(/#\/algorithms\/pll-z$/);
  await expect(page.getByTestId('selected-formula')).toHaveText(
    registry.variants['pll-z/main'].moves.join(' '),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
for (const width of [1440, 390])
  test('variant playback, sources and layout at ' + width, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 950 });
    await page.goto('#/algorithms/f2l-01');
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    const select = page.getByRole('combobox', { name: 'Formula variant', exact: true });
    const id = 'f2l-01/main/br';
    await select.selectOption(id);
    await expect(select).toHaveValue(id);
    await expect(page.getByTestId('selected-formula')).toHaveText(
      registry.variants[id].moves.join(' '),
    );
    await expect(page.getByLabel('Move position')).toHaveValue('0');
    await page.getByRole('button', { name: 'Next move', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Move position')).toHaveValue('1');
    await expect(page.locator('.case-sources a').first()).toHaveAttribute(
      'href',
      registry.variants[id].sourceRefs[0].url,
    );
    await page.locator('twisty-player').scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      const p = document.querySelector('twisty-player') as any;
      await p.experimentalCurrentThreeJSPuzzleObject();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: 'test-results/algorithm-detail-' + width + '-' + info.project.name + '.png',
      fullPage: true,
    });
    await page.goto('#/algorithms/unknown');
    await expect(page.getByRole('heading', { name: 'Case not found.' })).toBeVisible();
    await expect(page.locator('twisty-player')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
test('normal lesson entry does not fetch raw fixtures or cross data', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('#/learn/notation');
  await expect(page.getByRole('heading', { name: 'Meet your cube' })).toBeVisible();
  expect(
    urls.filter((u) =>
      /distance-v1|fixtures.json|generate-case-setups|algorithms\/data\/fixtures/.test(u),
    ),
  ).toEqual([]);
});
