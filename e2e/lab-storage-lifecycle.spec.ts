import { test, expect } from '@playwright/test';
test('blocked opening fails recoverably and does not reset an existing database', async ({
  page,
}) => {
  await page.goto('club/#/guide');
  const result = await page.evaluate(async () => {
    const path = '/cube-steps/src/lab/experiments/storage.ts';
    const { openLabStore } = await import(/* @vite-ignore */ path);
    const name = 'lab-blocked-' + crypto.randomUUID();
    const raw = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open(name, 1);
      q.onupgradeneeded = () => q.result.createObjectStore('sentinel');
      q.onsuccess = () => resolve(q.result);
    });
    await new Promise<void>((resolve) => {
      const tx = raw.transaction('sentinel', 'readwrite');
      tx.objectStore('sentinel').put('keep', 'value');
      tx.oncomplete = () => resolve();
    });
    const factory = { open: () => indexedDB.open(name, 2) };
    const message = await openLabStore(factory, async () => {}, name).then(
      () => '',
      (e: Error) => e.message,
    );
    raw.close();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const check = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open(name);
      q.onsuccess = () => resolve(q.result);
    });
    const version = check.version;
    const value = await new Promise((resolve) => {
      const q = check.transaction('sentinel').objectStore('sentinel').get('value');
      q.onsuccess = () => resolve(q.result);
    });
    check.close();
    indexedDB.deleteDatabase(name);
    return { message, version, value };
  });
  expect(result.message).toContain('blocked');
  expect(result.version).toBe(1);
  expect(result.value).toBe('keep');
});
test('Lab repository broadcasts committed records to another tab without touching Timer', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const other = await context.newPage(),
    name = 'lab-broadcast-' + Date.now();
  for (const p of [page, other]) {
    await p.goto('club/#/guide');
    await p.evaluate(async (name) => {
      const rp = '/cube-steps/src/lab/experiments/repository.ts',
        sp = '/cube-steps/src/lab/experiments/storage.ts';
      const { createLabRepository } = await import(/* @vite-ignore */ rp),
        { openLabStore } = await import(/* @vite-ignore */ sp);
      (window as any).labRepo = createLabRepository(() => openLabStore(indexedDB, undefined, name));
      await (window as any).labRepo.refresh();
    }, name);
  }
  await page.evaluate(async () => {
    const raw = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open('cubesteps.club.timer', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('attempts', { keyPath: 'id' });
      q.onsuccess = () => resolve(q.result);
    });
    await new Promise<void>((resolve) => {
      const tx = raw.transaction('attempts', 'readwrite');
      tx.objectStore('attempts').put({ id: 'sentinel', keep: true });
      tx.oncomplete = () => resolve();
    });
    raw.close();
    const hp = '/cube-steps/e2e/harnesses/lab-storage.ts',
      h = await import(/* @vite-ignore */ hp);
    await (window as any).labRepo.saveExperiment(await h.storageFixture());
  });
  await expect
    .poll(() => other.evaluate(() => (window as any).labRepo.snapshot().experiments.length), {
      timeout: 15000,
    })
    .toBe(1);
  const preserved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open('cubesteps.club.timer');
      q.onsuccess = () => resolve(q.result);
    });
    const v = await new Promise((resolve) => {
      const q = db.transaction('attempts').objectStore('attempts').get('sentinel');
      q.onsuccess = () => resolve(q.result);
    });
    db.close();
    return v;
  });
  expect(preserved).toEqual({ id: 'sentinel', keep: true });
  for (const p of [page, other]) await p.evaluate(() => (window as any).labRepo.dispose());
});
