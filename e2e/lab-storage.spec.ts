import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('failed experiment saves survive Lab navigation and can be retried without duplicate IDs', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).failLabWrite = true;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'experiments' && (window as any).failLabWrite)
        throw new DOMException('Example quota failure', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await page.goto('club/#/lab');
  await dismissTutorialForTest(page);
  await page.getByLabel('Scramble sequence').fill('R U F');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.locator('.lab-candidate').first()).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Stop analysis' }).click();
  await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toBeVisible();
  await expect(page.getByText('Experiment saved on this device.', { exact: true })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'CFOP Lab', exact: true })
    .click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toBeVisible();
  await page.evaluate(() => ((window as any).failLabWrite = false));
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toHaveCount(0);
  await expect(page.getByLabel('Saved experiments').locator('option')).toHaveCount(2);
});
test('Lab saves immutable routes and reloads without searching', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('club/#/lab');
  await dismissTutorialForTest(page);
  await page.getByLabel('Scramble sequence').fill('R U F2 L D2 B R2');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.locator('.lab-candidate').first()).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Stop analysis' }).click();
  await page.getByLabel('Experiment label (optional)').fill('Evening practice');
  await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
  await expect(page.getByText('Experiment saved on this device.', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  const id = await page
    .getByLabel('Saved experiments')
    .locator('option')
    .nth(1)
    .getAttribute('value');
  await page.reload();
  await page.getByLabel('Scramble sequence').fill('F2');
  await page.getByLabel('Saved experiments').selectOption(id!);
  await expect(page.getByText('Saved experiment loaded. Search has not restarted.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Stop analysis' })).toHaveCount(0);
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2 L D2 B R2');
  await expect(page.getByRole('heading', { name: 'Pinned route', exact: true })).toBeVisible();
});
test('real Lab transactions preserve revisions, conflicts, corrupt data and database boundaries', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/#/guide');
  const result = await page.evaluate(async () => {
    const harness = '/cube-steps/e2e/harnesses/lab-storage.ts',
      storePath = '/cube-steps/src/lab/experiments/storage.ts',
      snapPath = '/cube-steps/src/lab/experiments/snapshots.ts';
    const { storageFixture } = await import(/* @vite-ignore */ harness),
      { openLabStore } = await import(/* @vite-ignore */ storePath),
      { createComparison } = await import(/* @vite-ignore */ snapPath);
    const e = await storageFixture(),
      name = 'lab-test-' + crypto.randomUUID(),
      a = await openLabStore(indexedDB, undefined, name),
      b = await openLabStore(indexedDB, undefined, name);
    await a.saveExperiment(e);
    const c = createComparison(e, e.routes[0].id, e.routes[1].id);
    await a.saveComparison(c);
    const now = new Date().toISOString(),
      attempt = {
        schemaVersion: 1,
        id: 'attempt',
        revision: 0,
        previousRevision: null,
        createdAt: now,
        updatedAt: now,
        experimentId: e.id,
        routeId: e.routes[0].id,
        testerId: 'anonymous',
        timingMethod: 'keyboard',
        endpoint: 'cross-f2l',
        kind: 'measured',
        outcome: 'followed',
        rawMs: 10000,
        setupConfirmed: true,
        holdConfirmed: true,
        interruption: null,
        deletedAt: null,
      };
    await a.saveAttempt(attempt, null);
    await a.saveAttempt({ ...attempt, revision: 1, previousRevision: 0, note: 'correction' }, 0);
    const stale = await b
      .saveAttempt({ ...attempt, revision: 1, previousRevision: 0, note: 'stale' }, 0)
      .then(
        () => false,
        () => true,
      );
    const token = await a.softDeleteAttempt('attempt', 1);
    await b.undoDelete(token);
    const staleUndo = await a.undoDelete(token).then(
      () => false,
      () => true,
    );
    const conflict = await a.saveExperiment({ ...e, label: 'overwrite' }).then(
      () => false,
      () => true,
    );
    a.close();
    b.close();
    const reload = await openLabStore(indexedDB, undefined, name),
      saved = await reload.list();
    reload.close();
    const raw = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open(name);
      q.onsuccess = () => resolve(q.result);
    });
    await new Promise<void>((resolve) => {
      const tx = raw.transaction('attempts', 'readwrite');
      tx.objectStore('attempts').put({ id: 'unknown', schemaVersion: 99 });
      tx.oncomplete = () => resolve();
    });
    raw.close();
    const again = await openLabStore(indexedDB, undefined, name),
      invalid = await again.list();
    // A version change closes the old connection rather than resetting data.
    const future = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open(name, 2);
      q.onsuccess = () => resolve(q.result);
    });
    future.close();
    const futureRejected = await openLabStore(indexedDB, undefined, name).then(
      (s: any) => {
        s.close();
        return false;
      },
      () => true,
    );
    const oldClosed = await again.list().then(
      () => false,
      () => true,
    );
    const inspect = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open(name);
      q.onsuccess = () => resolve(q.result);
    });
    const preserved = await new Promise<any>((resolve) => {
      const q = inspect.transaction('attempts').objectStore('attempts').get('unknown');
      q.onsuccess = () => resolve(q.result);
    });
    inspect.close();
    indexedDB.deleteDatabase(name);
    return {
      stale,
      staleUndo,
      conflict,
      futureRejected,
      oldClosed,
      preserved,
      invalid: invalid.incompatibleCount,
      revision: saved.attempts[0].revision,
      trail: saved.attemptRevisions.length,
      sameRoutes: JSON.stringify(e.routes) === JSON.stringify(saved.experiments[0].routes),
    };
  });
  expect(result).toEqual({
    stale: true,
    staleUndo: true,
    conflict: true,
    futureRejected: true,
    oldClosed: true,
    preserved: { id: 'unknown', schemaVersion: 99 },
    invalid: 1,
    revision: 3,
    trail: 4,
    sameRoutes: true,
  });
});
