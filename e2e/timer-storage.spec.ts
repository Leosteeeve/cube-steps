import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
import type { TimerRepository } from '../src/club/timer/repository';
declare global {
  interface Window {
    storageTestRepository: TimerRepository;
  }
}
test('real IndexedDB preserves concurrent writes, revisions, invalid rows and future databases', async ({
  page,
}) => {
  await page.goto('club/');
  const result = await page.evaluate(async () => {
    const path = '/cube-steps/src/club/timer/storage.ts';
    const { openTimerStore } = (await import(
      /* @vite-ignore */ path
    )) as typeof import('../src/club/timer/storage');
    const name = `timer-test-${crypto.randomUUID()}`;
    const original = {
      version: 1 as const,
      id: 'a',
      createdAt: '2026-10-13T00:00:00.000Z',
      rawMs: 10000,
      scramble: 'R U',
      inspectionMs: null,
      inspectionPenalty: 'none' as const,
      manualPenalty: 'none' as const,
      interruption: null,
      revision: 0,
      deletedAt: null,
    };
    const a = await openTimerStore(indexedDB, name),
      b = await openTimerStore(indexedDB, name);
    await Promise.all([a.add(original), b.add({ ...original, id: 'b' })]);
    await a.add(original);
    await a.updatePenalty('a', 0, 'plus2');
    const stale = await b.updatePenalty('a', 0, 'dnf').then(
      () => false,
      () => true,
    );
    const replay = await b.add(original).then(
      () => false,
      () => true,
    );
    const token = await a.softDelete('a', 1, '2026-10-13T01:00:00.000Z');
    const undo = await b.undoDelete(token);
    const staleUndo = await a.undoDelete(token);
    a.close();
    b.close();
    const c = await openTimerStore(indexedDB, name);
    const saved = await c.list();
    c.close();
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open(name);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = raw.transaction('attempts', 'readwrite');
      tx.objectStore('attempts').put({ id: 'bad', version: 99 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    raw.close();
    const d = await openTimerStore(indexedDB, name);
    const invalid = await d.list();
    d.close();
    const future = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open(name, 2);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    future.close();
    const rejected = await openTimerStore(indexedDB, name).then(
      (s) => {
        s.close();
        return false;
      },
      () => true,
    );
    const check = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open(name);
      q.onsuccess = () => resolve(q.result);
    });
    const preserved = await new Promise<unknown>((resolve) => {
      const q = check.transaction('attempts').objectStore('attempts').get('bad');
      q.onsuccess = () => resolve(q.result);
    });
    const version = check.version;
    check.close();
    indexedDB.deleteDatabase(name);
    return { stale, replay, undo, staleUndo, saved, invalid, rejected, preserved, version };
  });
  expect(result).toMatchObject({
    stale: true,
    replay: true,
    undo: true,
    staleUndo: false,
    rejected: true,
    version: 2,
    preserved: { id: 'bad', version: 99 },
  });
  expect(result.saved.attempts).toHaveLength(2);
  expect(result.saved.attempts.find((a) => a.id === 'a')).toMatchObject({
    revision: 3,
    deletedAt: null,
    manualPenalty: 'plus2',
  });
  expect(result.invalid.invalidCount).toBe(1);
  expect(result.invalid.attempts).toHaveLength(2);
});
test('a second tab receives committed records without replacing its own history', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  const name = `timer-broadcast-${Date.now()}`;
  for (const p of [page, other]) {
    await p.goto('club/');
    await p.evaluate(async (name) => {
      const repositoryPath = '/cube-steps/src/club/timer/repository.ts',
        storePath = '/cube-steps/src/club/timer/storage.ts';
      const { createTimerRepository } = (await import(
        /* @vite-ignore */ repositoryPath
      )) as typeof import('../src/club/timer/repository');
      const { openTimerStore } = (await import(
        /* @vite-ignore */ storePath
      )) as typeof import('../src/club/timer/storage');
      window.storageTestRepository = createTimerRepository(() => openTimerStore(indexedDB, name));
      await window.storageTestRepository.refresh();
    }, name);
  }
  await page.evaluate(() =>
    window.storageTestRepository.record({
      version: 1,
      id: 'cross-tab',
      createdAt: '2026-10-13T00:00:00.000Z',
      rawMs: 12000,
      scramble: 'R U',
      inspectionMs: null,
      inspectionPenalty: 'none',
      manualPenalty: 'none',
      interruption: null,
      revision: 0,
      deletedAt: null,
    }),
  );
  await expect
    .poll(() => other.evaluate(() => window.storageTestRepository.snapshot().attempts.length))
    .toBe(1);
  await other.evaluate(() => window.storageTestRepository.updatePenalty('cross-tab', 0, 'plus2'));
  await expect
    .poll(() =>
      page.evaluate(() => window.storageTestRepository.snapshot().attempts[0]?.manualPenalty),
    )
    .toBe('plus2');
  for (const p of [page, other]) await p.evaluate(() => window.storageTestRepository.dispose());
});

test.beforeEach(async ({ page }) => {
  await page.goto('club/');
  await dismissTutorialForTest(page);
});
