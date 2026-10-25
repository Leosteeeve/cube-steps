import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';

test('new students answer learning preferences and get LBL with Roux as a later option', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('club/#/find-your-route');
  await dismissTutorialForTest(page);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByLabel('I cannot solve independently yet', { exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByLabel('I would rather remember fewer sequences', { exact: true }).check();
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/route-memory-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page
    .getByLabel('I like figuring out why moves work and trying my own ideas', { exact: true })
    .check();
  await page.screenshot({
    path: `test-results/route-understanding-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(
    page.getByLabel('I would rather remember fewer sequences', { exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What would you like to work toward?',
  );
  for (const answer of ['My first independent solve', 'Short sessions']) {
    await page.getByLabel(answer, { exact: true }).check();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByLabel('Both', { exact: true }).check();
  await page.getByRole('button', { name: 'Show my route', exact: true }).click();
  await expect(page.locator('.club-result-label')).toHaveText('LBL');
  await expect(page.getByRole('link', { name: 'Start lesson', exact: true })).toHaveAttribute(
    'href',
    '#/learn/notation',
  );
  await expect(page.getByText(/Once you can solve independently, Beginner Roux/)).toBeVisible();
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/route-result-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(
    /memorization|understanding/,
  );
  expect(errors).toEqual([]);
});
