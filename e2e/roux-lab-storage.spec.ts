import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('Roux saves remain unsaved after a quota failure and can be retried after navigation', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).failRouxWrite = true;
    IDBObjectStore.prototype.put = function (...args) {
      if (
        this.transaction.db.name === 'cubesteps.club.roux-lab' &&
        this.name === 'experiments' &&
        (window as any).failRouxWrite
      )
        throw new DOMException('Example quota failure', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/roux-lab');
  await page.getByRole('button', { name: 'White / blue only' }).click();
  await page.getByLabel('Scramble sequence').fill('R F U');
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.locator('[data-roux-route]').first()).toBeVisible({ timeout: 35000 });
  await page.getByText('Save & open experiments', { exact: true }).click();
  await page.getByLabel('Experiment label (optional)').fill('Evening blocks');
  await page.getByRole('button', { name: 'Save Roux experiment', exact: true }).click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toBeVisible();
  await expect(
    page.getByText('Roux experiment saved on this device.', { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await page.getByRole('button', { name: 'Labs', exact: true }).click();
  await page.getByRole('link', { name: 'Roux Test Lab', exact: true }).click();
  await page.getByText('Save & open experiments', { exact: true }).click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toBeVisible();
  await page.evaluate(() => {
    (window as any).failRouxWrite = false;
  });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toHaveCount(0, {
    timeout: 20000,
  });
  await expect(page.getByLabel('Saved Roux experiments').locator('option')).toHaveCount(2);
  const id = await page
    .getByLabel('Saved Roux experiments')
    .locator('option')
    .nth(1)
    .getAttribute('value');
  await page.reload();
  await page.getByText('Save & open experiments', { exact: true }).click();
  await page.getByLabel('Saved Roux experiments').selectOption(id!);
  await expect(
    page.getByText('Saved Roux experiment loaded. Search has not restarted.'),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R F U');
  await expect(page.getByRole('button', { name: 'Stop search' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toBeVisible();
});
test('Roux transactions preserve revisions, reject atomic conflicts and leave CFOP and Timer bytes untouched', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/#/guide');
  const result = await page.evaluate(async () => {
    const hp = '/cube-steps/e2e/harnesses/roux-lab-storage.ts',
      sp = '/cube-steps/src/roux-lab/experiments/storage.ts',
      xp = '/cube-steps/src/roux-lab/experiments/snapshots.ts';
    const { storageFixture, verifyStored } = await import(/* @vite-ignore */ hp),
      { openRouxStore } = await import(/* @vite-ignore */ sp),
      { createRouxComparison } = await import(/* @vite-ignore */ xp);
    const sentinel = async (name: string, write = false) =>
      new Promise<string>((resolve, reject) => {
        const q = indexedDB.open(name, 1);
        q.onupgradeneeded = () => q.result.createObjectStore('sentinel');
        q.onerror = () => reject(q.error);
        q.onsuccess = () => {
          const db = q.result,
            t = db.transaction('sentinel', write ? 'readwrite' : 'readonly'),
            store = t.objectStore('sentinel');
          if (write) store.put({ history: [{ rawMs: 12345, note: 'untouched' }] }, 'record');
          const r = store.getAll();
          t.oncomplete = () => {
            db.close();
            resolve(JSON.stringify(r.result));
          };
        };
      });
    const before = await Promise.all(
      ['cubesteps.club.lab', 'cubesteps.club.timer'].map((n) => sentinel(n, true)),
    );
    const e = await storageFixture(),
      a = await openRouxStore(indexedDB, verifyStored),
      b = await openRouxStore(indexedDB, verifyStored);
    await a.saveExperiment(e);
    const c = createRouxComparison(e, e.routes[0].id, e.routes[1].id);
    await a.saveComparison(c);
    const now = new Date().toISOString(),
      attempt = {
        schemaVersion: 1,
        method: 'roux-advanced',
        id: 'attempt',
        revision: 0,
        previousRevision: null,
        createdAt: now,
        updatedAt: now,
        experimentId: e.id,
        routeId: e.routes[0].id,
        testerId: 'anonymous',
        timingMethod: 'keyboard',
        endpoint: 'roux-blocks',
        kind: 'measured',
        outcome: 'followed',
        rawMs: 12000,
        setupConfirmed: true,
        holdConfirmed: true,
        interruption: null,
        deletedAt: null,
      };
    await a.saveAttempt(attempt, null);
    await a.saveAttempt({ ...attempt, revision: 1, previousRevision: 0, note: 'first edit' }, 0);
    let conflict = false;
    try {
      await b.saveAttempt({ ...attempt, revision: 1, previousRevision: 0, note: 'stale edit' }, 0);
    } catch {
      conflict = true;
    }
    const token = await a.softDeleteAttempt('attempt', 1);
    await a.undoDelete(token);
    const rows = await a.list();
    const second = { ...e, id: 'atomic-new' };
    let atomic = false;
    try {
      await a.commitImport({
        experiments: [second, { ...e, label: 'Conflicting label' }],
        comparisons: [],
        trialBlocks: [],
        testers: [],
        attempts: [],
        attemptRevisions: [],
      });
    } catch {
      atomic = true;
    }
    const noPartial = !(await a.list()).experiments.some((x: any) => x.id === 'atomic-new');
    const put = IDBObjectStore.prototype.put;
    let aborted = false;
    IDBObjectStore.prototype.put = function (...args) {
      const r = put.apply(this, args);
      if (this.transaction.db.name === 'cubesteps.club.roux-lab' && this.name === 'experiments')
        this.transaction.abort();
      return r;
    };
    try {
      await a.saveExperiment({ ...e, id: 'late-abort' });
    } catch {
      aborted = true;
    } finally {
      IDBObjectStore.prototype.put = put;
    }
    const noAborted = !(await a.list()).experiments.some((x: any) => x.id === 'late-abort');
    // A well-formed but unsupported record is preserved byte-for-byte for recovery.
    const foreign = {
      id: 'incompatible',
      schemaVersion: 99,
      method: 'cfop-advanced',
      payload: 'keep this',
    };
    await new Promise<void>((resolve, reject) => {
      const q = indexedDB.open('cubesteps.club.roux-lab', 1);
      q.onerror = () => reject(q.error);
      q.onsuccess = () => {
        const db = q.result,
          t = db.transaction('experiments', 'readwrite');
        t.objectStore('experiments').put(foreign);
        t.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    const recovery = (await a.list()).incompatibleRecords.find(
      (r: any) => r.value.id === 'incompatible',
    );
    a.close();
    b.close();
    const after = await Promise.all(
      ['cubesteps.club.lab', 'cubesteps.club.timer'].map((n) => sentinel(n)),
    );
    return {
      conflict,
      atomic,
      noPartial,
      aborted,
      noAborted,
      recovered: JSON.stringify(recovery?.value) === JSON.stringify(foreign),
      revision: rows.attempts[0].revision,
      revisions: rows.attemptRevisions.length,
      deleted: rows.attempts[0].deletedAt,
      before,
      after,
    };
  });
  expect(result).toMatchObject({
    conflict: true,
    atomic: true,
    noPartial: true,
    aborted: true,
    noAborted: true,
    recovered: true,
    revision: 3,
    revisions: 4,
    deleted: null,
  });
  expect(result.after).toEqual(result.before);
});
