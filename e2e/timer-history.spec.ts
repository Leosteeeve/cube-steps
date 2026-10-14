import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
declare global {
  interface Window {
    restoreTimerStorage: () => void;
  }
}
test('history survives reload, corrections update statistics and downloads contain full data', async ({
  page,
}) => {
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 20000 });
  const text = await page.locator('.timer-scramble-text').innerText();
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-last')).toContainText('Saved on this device');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await page.reload();
  await expect(surface).toBeEnabled({ timeout: 20000 });
  await page.getByRole('button', { name: /View solve 1:/ }).click();
  await expect(page.getByRole('img', { name: 'Historical scramble diagram' })).toBeVisible();
  await expect(page.locator('.timer-record-details')).toContainText(text);
  await page.getByRole('combobox', { name: 'Adjustment for solve 1' }).selectOption('plus2');
  await expect(page.getByRole('combobox', { name: 'Adjustment for solve 1' })).toHaveValue('plus2');
  await expect(page.locator('.timer-last')).toContainText('Manual +2');
  const downloadJson = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const json = JSON.parse(await readFile((await (await downloadJson).path())!, 'utf8'));
  expect(json.attempts).toHaveLength(1);
  expect(json.attempts[0]).toMatchObject({ scramble: text, manualPenalty: 'plus2', revision: 1 });
  expect(json.unsavedIds).toEqual([]);
  const downloadCsv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const csv = await readFile((await (await downloadCsv).path())!, 'utf8');
  expect(csv).toContain('\r\n');
  expect(csv).toContain('"saved"');
  expect(csv).toContain('"effectiveMs"');
  await page.getByRole('button', { name: 'Delete solve 1' }).click();
  await expect(page.getByText('0 solves', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo deletion' }).click();
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
});
test('unsaved results remain exportable and retry persists them exactly once', async ({ page }) => {
  await page.addInitScript(() => {
    const original = indexedDB.open.bind(indexedDB);
    window.restoreTimerStorage = () => {
      indexedDB.open = original;
    };
    indexedDB.open = () => {
      throw new DOMException('Test denied storage', 'SecurityError');
    };
  });
  await page.goto('club/#/timer');
  // The shared welcome dismissal already visited /club/; reload so the fault
  // injection runs even when goto above only changes the hash.
  await page.reload();
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 20000 });
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-last')).toContainText('Not saved');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const json = JSON.parse(await readFile((await (await event).path())!, 'utf8'));
  expect(json.attempts).toHaveLength(1);
  expect(json.unsavedIds).toEqual([json.attempts[0].id]);
  await page.evaluate(() => window.restoreTimerStorage());
  await page.getByRole('button', { name: 'Retry saving result' }).click();
  await expect(page.locator('.timer-last')).toContainText('Saved on this device');
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
  const count = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open('cubesteps.club.timer');
      q.onsuccess = () => resolve(q.result);
    });
    const n = await new Promise<number>((resolve) => {
      const q = db.transaction('attempts').objectStore('attempts').count();
      q.onsuccess = () => resolve(q.result);
    });
    db.close();
    return n;
  });
  expect(count).toBe(1);
});
test('populated charts and historical controls remain readable on phones', async ({
  page,
}, info) => {
  await page.goto('club/');
  await page.evaluate(async () => {
    const path = '/cube-steps/src/club/timer/storage.ts';
    const { openTimerStore } = (await import(
      /* @vite-ignore */ path
    )) as typeof import('../src/club/timer/storage');
    const store = await openTimerStore();
    for (let i = 0; i < 12; i++)
      await store.add({
        version: 1,
        id: `layout-${i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        rawMs: 65000 - i * 1300 + (i % 3) * 900,
        scramble: "R U R' U'",
        inspectionMs: null,
        inspectionPenalty: 'none',
        manualPenalty: i === 3 ? 'dnf' : 'none',
        interruption: null,
        revision: 0,
        deletedAt: null,
      });
    store.close();
  });
  await page.goto('club/#/timer');
  await expect(page.getByText('12 solves', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Timing surface', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('combobox', { name: 'Inspect a plotted solve' }).selectOption('layout-3');
    await expect(page.getByText('Solve 4: DNF', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /View solve 12:/ }).click();
    await expect(page.getByRole('img', { name: 'Historical scramble diagram' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await page.getByRole('combobox', { name: 'Adjustment for solve 12' }).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: `test-results/club-timer-history-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: /View solve 12:/ }).click();
  }
});
test('phone timer and history fit the viewport with generous controls', async ({ page }, info) => {
  await page.goto('club/#/timer');
  await expect(page.getByRole('button', { name: 'Timing surface', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const name of ['Timing surface', 'New scramble', 'Export JSON']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `test-results/club-timer-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
});

test.beforeEach(async ({ page }) => {
  await page.goto('club/');
  await dismissTutorialForTest(page);
});
