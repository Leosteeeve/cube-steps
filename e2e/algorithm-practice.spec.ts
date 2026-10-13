import { test, expect } from '@playwright/test';
test.use({ actionTimeout: 5000 });
const key = 'cubesteps.practice-selection.v1';
async function seed(page: import('@playwright/test').Page, ids = ['oll-20']) {
  await page.addInitScript(
    ({ key, ids }) => {
      if (!sessionStorage.getItem('practice-test-seeded')) {
        localStorage.setItem(key, JSON.stringify({ version: 1, caseIds: ids, groupIds: [] }));
        sessionStorage.setItem('practice-test-seeded', 'yes');
      }
    },
    { key, ids },
  );
}
for (const width of [1440, 390])
  test('recognize, reveal and next with keyboard at ' + width, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 950 });
    await seed(page);
    await page.goto('#/practice');
    await expect(page.getByText('1 case selected', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start practice', exact: true }).focus();
    await page.keyboard.press('Enter');
    const exercise = page.getByRole('region', { name: 'Current exercise' }),
      reveal = exercise.getByRole('button', { name: 'Show solution', exact: true });
    await expect(reveal).toBeEnabled();
    expect(await exercise.innerHTML()).not.toMatch(/oll-20|OLL 20|twisty-player|algorithm-card/);
    const first = await exercise.locator('.practice-setup code').first().textContent();
    await reveal.focus();
    await page.keyboard.press('Enter');
    await expect(exercise.getByRole('heading', { name: 'OLL 20', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Next case', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(reveal).toBeEnabled();
    await expect(page.locator('twisty-player')).toHaveCount(0);
    expect(await exercise.locator('.practice-setup code').first().textContent()).not.toBe(first);
    expect(await exercise.innerHTML()).not.toMatch(/oll-20|OLL 20|algorithm-card/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: 'test-results/practice-hidden-' + width + '-' + info.project.name + '.png',
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
    await expect(exercise).toHaveCount(0);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
    expect(Object.keys(stored).sort()).toEqual(['caseIds', 'groupIds', 'version']);
    expect(stored.caseIds).toEqual(['oll-20']);
    expect(errors).toEqual([]);
  });
test('library preselection, rapid changes and history dispose old answers', async ({ page }) => {
  await seed(page, []);
  await page.goto('#/algorithms');
  await page.getByRole('checkbox', { name: 'Select OLL 20', exact: true }).check();
  await page.getByRole('button', { name: 'Practice selected cases', exact: true }).click();
  await expect(page).toHaveURL(/#\/practice$/);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Show solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.goBack();
  await expect(page).toHaveURL(/#\/algorithms$/);
  await expect(page.locator('twisty-player')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toHaveCount(0);
  // Delay the actual worker module so changing the pool precedes its response.
  await page.route('**/practice.worker.ts*', async (route) => {
    await new Promise((r) => setTimeout(r, 250));
    await route.continue();
  });
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.locator('.practice-selection>summary').click();
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'OLL 21', exact: true }).check();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Show solution', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Current exercise' })
      .getByRole('heading', { name: 'OLL 21', exact: true }),
  ).toBeVisible();
});
test('blocked storage and empty pools remain usable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Denied', 'SecurityError');
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/practice');
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'H perm', exact: true }).check();
  await expect(page.getByText(/cannot be saved/)).toBeVisible();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Show solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
