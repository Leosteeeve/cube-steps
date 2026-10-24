import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dismissTutorialForTest } from './helpers/tutorial';
test('Roux export defaults are private and import is inert until the explicit atomic save', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.evaluate(async () => {
    const hp = '/cube-steps/e2e/harnesses/roux-lab-storage.ts',
      sp = '/cube-steps/src/roux-lab/experiments/storage.ts';
    const { storageFixture, verifyStored } = await import(/* @vite-ignore */ hp),
      { openRouxStore } = await import(/* @vite-ignore */ sp),
      e = await storageFixture(),
      store = await openRouxStore(indexedDB, verifyStored);
    await store.saveExperiment(e);
    await store.saveTester({ id: 'member', label: 'Private member label' });
    store.close();
  });
  await page.goto('club/#/roux-lab');
  await page.getByText('Import, export & recovery', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Stored pair', exact: true }).check();
  await expect(page.getByLabel('Include trial records', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Include private tester labels', { exact: true })).not.toBeChecked();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Roux experiments', exact: true }).click();
  const download = await downloaded,
    text = await readFile((await download.path())!, 'utf8'),
    file = JSON.parse(text);
  expect(file.method).toBe('roux-advanced');
  expect(file.testers).toEqual([]);
  expect(text).not.toContain('Private member label');
  const imported = {
    ...file,
    experiments: file.experiments.map((e: any) => ({
      ...e,
      id: 'imported-copy',
      label: 'Imported copy',
    })),
  };
  await page.getByLabel('Import Roux file', { exact: true }).setInputFiles({
    name: 'roux-copy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.getByRole('region', { name: 'Roux import preview' })).toContainText(
    'Nothing has been saved yet.',
    { timeout: 20000 },
  );
  await page.getByText('Save & open experiments', { exact: true }).click();
  await expect(page.getByLabel('Saved Roux experiments').locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save imported experiments', exact: true }).click();
  await expect(page.getByText('Import saved on this device.', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByLabel('Saved Roux experiments').locator('option')).toHaveCount(3);
  await page.getByLabel('Saved Roux experiments').selectOption('imported-copy');
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toBeVisible({
    timeout: 20000,
  });
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await page.getByLabel('Import Roux file', { exact: true }).setInputFiles({
    name: 'cfop.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...file, method: 'cfop-advanced' })),
  });
  await expect(page.getByRole('alert')).toContainText('CFOP files use CFOP Lab.');
  await expect(page.getByLabel('Saved Roux experiments').locator('option')).toHaveCount(3);
});
