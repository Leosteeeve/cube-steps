import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dismissTutorialForTest } from './helpers/tutorial';
test('a real searched route transfers to a fresh browser notebook and records a both-block trial', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/roux-lab');
  await page.getByRole('button', { name: 'White / blue only' }).click();
  await page.getByLabel('Scramble sequence').fill('R F U');
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toBeVisible({
    timeout: 35000,
  });
  const stop = page.getByRole('button', { name: 'Stop search', exact: true });
  if (await stop.isVisible()) await stop.click();
  await page
    .getByRole('button', { name: 'Show basic LSE as a separate route', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Basic LSE route selected', exact: true }),
  ).toBeDisabled({ timeout: 20000 });
  await page.getByText('Save & open experiments', { exact: true }).click();
  await page.getByLabel('Experiment label (optional)').fill('Public UI transfer example');
  await page.getByRole('button', { name: 'Save Roux experiment', exact: true }).click();
  await expect(
    page.getByText('Roux experiment saved on this device.', { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByText('Import, export & recovery', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Public UI transfer example', exact: true }).check();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Roux experiments', exact: true }).click();
  const download = await waiting,
    text = await readFile((await download.path())!, 'utf8'),
    file = JSON.parse(text);
  expect(file.attempts).toEqual([]);
  expect(file.testers).toEqual([]);
  expect(file.experiments[0].routes.some((r: any) => r.lseMode === 'basic')).toBe(true);
  const context = await browser.newContext(),
    second = await context.newPage();
  try {
    const url = new URL(page.url());
    url.hash = '/roux-lab';
    await second.goto(url.href);
    await dismissTutorialForTest(second);
    await second.getByText('Save & open experiments', { exact: true }).click();
    await expect(second.getByLabel('Saved Roux experiments').locator('option')).toHaveCount(1);
    await second.getByText('Import, export & recovery', { exact: true }).click();
    await second.getByLabel('Import Roux file', { exact: true }).setInputFiles({
      name: 'roux.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
    await expect(second.getByRole('region', { name: 'Roux import preview' })).toContainText(
      'Nothing has been saved yet.',
      { timeout: 20000 },
    );
    await expect(second.getByLabel('Saved Roux experiments').locator('option')).toHaveCount(1);
    await second.getByRole('button', { name: 'Save imported experiments', exact: true }).click();
    await expect(second.getByText('Import saved on this device.', { exact: true })).toBeVisible({
      timeout: 20000,
    });
    await second.getByLabel('Saved Roux experiments').selectOption(file.experiments[0].id);
    await expect(second.getByRole('region', { name: 'Selected Roux route' })).toBeVisible({
      timeout: 20000,
    });
    await second.getByLabel('Move position').focus();
    await second.keyboard.press('End');
    await expect(second.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
    await second
      .getByRole('navigation', { name: 'Roux Lab workspace' })
      .getByRole('link', { name: 'Trials & notes', exact: true })
      .click();
    await second.getByLabel('Timing method').selectOption('external-manual');
    await second.getByLabel('Attempt kind').selectOption('measured');
    await second.getByLabel(/I reset the original cube/).check();
    await second.getByLabel(/I matched the starting hold/).check();
    await second.getByLabel('External time', { exact: true }).fill('12.34');
    await second.getByRole('button', { name: 'Review external time' }).click();
    await second.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('followed');
    await second.getByRole('button', { name: 'Save trial', exact: true }).click();
    await expect(second.getByRole('region', { name: 'Trial history' })).toContainText('12.34 s');
    await second.getByRole('checkbox', { name: 'Public UI transfer example', exact: true }).check();
    await second.getByLabel('Include trial records', { exact: true }).check();
    const exported = second.waitForEvent('download');
    await second.getByRole('button', { name: 'Export Roux experiments', exact: true }).click();
    const saved = JSON.parse(await readFile((await (await exported).path())!, 'utf8'));
    expect(saved.attempts).toHaveLength(1);
    expect(saved.attempts[0]).toMatchObject({
      method: 'roux-advanced',
      endpoint: 'roux-blocks',
      rawMs: 12340,
      outcome: 'followed',
    });
    expect(saved.experiments[0].routes).toEqual(file.experiments[0].routes);
  } finally {
    await context.close();
  }
});
