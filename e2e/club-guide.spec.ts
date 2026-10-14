import { test, expect } from '@playwright/test';
test('Guide reads without engine assets, supports direct chapters and phone navigation', async ({
  page,
}) => {
  const errors: string[] = [],
    blocked: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/core\/cube\.|\/solver\/|\/cubing\//, (route) => {
    blocked.push(route.request().url());
    return route.abort();
  });
  await page.goto('club/#/guide/timer');
  await expect(page.getByRole('heading', { name: 'Make practice measurable' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Learning tools' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Guide', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'A little guidance. A lot to discover.' }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page
    .getByRole('navigation', { name: 'Guide chapters' })
    .getByRole('link', { name: /Read a move/ })
    .click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Read a move, then try it' })).toBeFocused();
  expect(blocked).toEqual([]);
  expect(errors).toEqual([]);
});
test('every explicit Guide tour opens on its own ready page; written link closes it', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const entries = [
    ['Home', 'A small first step'],
    ['Find your route', 'Start where you are'],
    ['Moves', 'Hold it the same way'],
    ['Lesson introduction', 'Follow the lesson order'],
    ['Lesson player', 'Follow the lesson order'],
    ['Solve your cube', 'Choose your input'],
    ['Algorithm library', 'Find a small set'],
    ['An algorithm case', 'Hold and recognize'],
    ['Formula practice', 'Choose what to practice'],
    ['Timer', 'Scramble and check'],
  ];
  for (const [name] of entries) {
    await page.goto('club/#/guide');
    await page.getByRole('button', { name: `Start ${name} tour`, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('dialog')).not.toContainText('Would you like');
    await page.getByRole('link', { name: 'Written guide', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/guide\//);
  }
  expect(errors).toEqual([]);
});
test('Guide text and links remain usable at 200 percent zoom', async ({ page }) => {
  await page.goto('club/#/guide/help');
  await page.evaluate(() => (document.body.style.zoom = '2'));
  await expect(page.getByRole('button', { name: 'Reset tutorial choices' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Reset tutorial choices' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
