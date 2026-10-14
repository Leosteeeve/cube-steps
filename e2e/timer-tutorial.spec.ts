import { test, expect, type Page } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
async function records(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('cubesteps.club.timer', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const r = db.transaction('attempts').objectStore('attempts').getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
test('welcome and tour block held Space, preserve data, and permit a fresh normal solve', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/timer');
  await expect(page.getByRole('dialog', { name: 'Would you like a quick tour?' })).toBeVisible({
    timeout: 20000,
  });
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  const scramble = await page.locator('.timer-scramble-text').textContent(),
    before = await records(page);
  await page.keyboard.down('Space');
  await page.getByRole('button', { name: 'Start tour', exact: true }).click();
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await page.keyboard.up('Space');
  for (let i = 0; i < 4; i++)
    await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
  await page.keyboard.down('Space');
  await page.keyboard.press('Escape');
  await surface.focus();
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  expect(await records(page)).toEqual(before);
  expect(await page.locator('.timer-scramble-text').textContent()).toBe(scramble);
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'running');
  await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toBeDisabled();
  await page.keyboard.press('Space');
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  const saved = await records(page);
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await page.getByRole('button', { name: 'Exit tour' }).click();
  expect(await records(page)).toEqual(saved);
  await expect(page.getByRole('checkbox', { name: '15-second inspection' })).not.toBeChecked();
  expect(errors).toEqual([]);
});
test.describe('touch guidance', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('touching a read-only target cannot start timing and help stays closed during inspection', async ({
    page,
  }) => {
    await page.goto('club/#/timer');
    await dismissTutorialForTest(page);
    const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
    await page.getByRole('button', { name: 'Page tour', exact: true }).tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).tap();
    const box = (await surface.boundingBox())!;
    await page.touchscreen.tap(box.x + 10, box.y + 10);
    await expect(surface).toHaveAttribute('data-phase', 'idle');
    await expect(page.getByText('0 solves', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Exit tour' }).tap();
    await page.getByRole('checkbox', { name: '15-second inspection' }).check();
    await surface.tap();
    await expect(surface).toHaveAttribute('data-phase', 'inspection');
    await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(surface).toHaveAttribute('data-phase', 'idle');
    await expect(page.getByText('0 solves', { exact: true })).toBeVisible();
  });
});
