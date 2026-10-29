import { dismissTutorialForTest } from './helpers/tutorial';
import { test, expect } from '@playwright/test';
import { selectNotation, renderNotationFrame } from './helpers/notation';
for (const width of [360, 390, 768, 1024, 1440])
  test(`moves layout, controls and navigation at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('club/#/moves');
    await dismissTutorialForTest(page);
    await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('.notation-player')).toHaveAttribute('data-progress', '0');
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(navigation.getByRole('link')).toHaveText(['Home', 'Learn', 'Guide']);
    await navigation.getByRole('button', { name: 'Practice', exact: true }).click();
    await expect(navigation.getByRole('link', { name: 'Moves', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(navigation.getByRole('link', { name: 'Timer', exact: true })).toHaveAttribute(
      'href',
      '#/timer',
    );
    await page.keyboard.press('Escape');
    await renderNotationFrame(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const name of ['Play move', 'Replay', 'Reset', 'Holding view', 'Direction view']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `test-results/moves-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    await selectNotation(page, "B'");
    await expect(page.getByLabel('Selected move')).toHaveText('B′');
    await page.getByRole('button', { name: 'Direction view', exact: true }).click();
    await page.getByRole('button', { name: 'D, Down face', exact: true }).click();
    await expect(page.getByLabel('Selected move')).toHaveText('D′');
    await expect(page.getByRole('button', { name: 'Direction view', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Play move', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'complete');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('.notation-player')).toHaveAttribute('data-progress', '0');
    await selectNotation(page, 'M2');
    await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
    await page.reload();
    await expect(page.getByLabel('Selected move')).toHaveText('U');
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('link', { name: /^Move Explorer A letter/ })).toHaveAttribute(
      'href',
      '#/moves',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
test('reduced motion, WebGL fallback and recoverable lazy module failure', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  await expect(page.getByRole('button', { name: 'After', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'After', exact: true }).click();
  await expect(page.getByRole('img', { name: 'After U', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.notation-player')).toHaveAttribute('data-progress', '0');
  await expect(page.getByRole('img', { name: 'Before U', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      if (type === 'webgl2') return null;
      return (original as any).call(this, type, ...args);
    } as typeof original;
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('3D animation is unavailable');
  await selectNotation(page, 'x');
  await page.getByRole('button', { name: 'After', exact: true }).click();
  await expect(page.getByLabel('Current holding')).toContainText('green up · yellow front');
  const moveExplorerModule = (url: URL) => url.pathname.endsWith('/MoveExplorerPage.tsx');
  let rejectedModules = 0;
  await page.route(moveExplorerModule, (route) => {
    rejectedModules++;
    return route.abort();
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not load');
  expect(rejectedModules).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Reload move explorer' })).toBeVisible();
  await page.unroute(moveExplorerModule);
  await page.getByRole('button', { name: 'Reload move explorer' }).click();
  await expect(page.getByRole('img', { name: 'Before U', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pick up a cube.' })).toBeVisible();
});
test('decoration off allows deliberate moves and explorer leaves stored learning data untouched', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cubesteps.club.motion.v1',
      JSON.stringify({ version: 1, preference: 'off' }),
    );
    localStorage.setItem(
      'cubesteps.club.progress.v1',
      JSON.stringify({ version: 1, selectedMethod: 'lbl', practiced: { lbl: ['notation'] } }),
    );
    sessionStorage.setItem('cubesteps.club.color-draft.v1', 'preserve this draft');
    localStorage.setItem(
      'cubesteps.club.timer-settings.v1',
      JSON.stringify({ version: 1, inspection: false }),
    );
  });
  await page.goto('club/#/moves');
  await dismissTutorialForTest(page);
  const timerRows = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cubesteps.club.timer', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('attempts', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const row = {
      version: 1,
      id: 'notation-preserve',
      createdAt: '2026-10-13T00:00:00.000Z',
      rawMs: 65000,
      scramble: 'R U',
      inspectionMs: null,
      inspectionPenalty: 'none',
      manualPenalty: 'none',
      interruption: null,
      revision: 0,
      deletedAt: null,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('attempts', 'readwrite');
      tx.objectStore('attempts').put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return [row];
  });
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  const draftBefore = await page.evaluate(() =>
    sessionStorage.getItem('cubesteps.club.color-draft.v1'),
  );
  await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'complete');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.getByRole('button', { name: 'D, Down face', exact: true }).click();
  await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('.notation-player')).toHaveAttribute('data-progress', '0');
  await selectNotation(page, 'E');
  await selectNotation(page, "Rw'");
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('.notation-player')).toHaveAttribute('data-phase', 'complete');
  await page.locator('h1').click();
  await page.keyboard.press('u');
  await page.keyboard.press('Space');
  await expect(page.locator('.notation-player')).toHaveAttribute('data-notation-move', "Rw'");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toEqual(before);
  expect(
    await page.evaluate(() => sessionStorage.getItem('cubesteps.club.color-draft.v1')),
  ).toEqual(draftBefore);
  expect(
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('cubesteps.club.timer', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction('attempts').objectStore('attempts').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return rows;
    }),
  ).toEqual(timerRows);
});
