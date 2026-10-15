import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dismissTutorialForTest } from './helpers/tutorial';
test.use({ actionTimeout: 10000 });
test('staged imports are atomic, recheck cross-tab conflicts and preserve prior records', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/#/guide');
  const result = await page.evaluate(async () => {
    const hp = '/cube-steps/e2e/harnesses/lab-storage.ts',
      sp = '/cube-steps/src/lab/experiments/storage.ts',
      tp = '/cube-steps/src/lab/experiments/transfer.ts',
      ep = '/cube-steps/src/lab/experiments/export.ts',
      cp = '/cube-steps/src/workers/lab-request.ts';
    const { storageFixture } = await import(/* @vite-ignore */ hp),
      { openLabStore } = await import(/* @vite-ignore */ sp),
      { stageLabImport, commitLabImport } = await import(/* @vite-ignore */ tp),
      { buildLabExport } = await import(/* @vite-ignore */ ep),
      { loadLabContext } = await import(/* @vite-ignore */ cp);
    const e = await storageFixture(),
      name = 'lab-transfer-' + crypto.randomUUID(),
      a = await openLabStore(indexedDB, undefined, name),
      b = await openLabStore(indexedDB, undefined, name);
    const snapshot = { ...(await a.list()), pending: [], error: '', conflicts: [] };
    const payload = buildLabExport({ ...snapshot, experiments: [e] }, { experimentIds: [e.id] });
    const context = await loadLabContext(),
      preview = await stageLabImport(
        new File([JSON.stringify(payload)], 'fixture.json'),
        context,
        snapshot,
      );
    const before = (await a.list()).experiments.length;
    await b.saveExperiment({ ...e, label: 'Another tab saved first' });
    let race = false;
    try {
      await commitLabImport(preview, {}, a);
    } catch {
      race = true;
    }
    const afterRace = await a.list();
    const data = {
      ...snapshot,
      experiments: [
        { ...e, id: 'new-a' },
        { ...e, id: 'new-b' },
      ],
    };
    const graph = Object.fromEntries(
      ['experiments', 'comparisons', 'trialBlocks', 'testers', 'attempts', 'attemptRevisions'].map(
        (k) => [k, (data as any)[k]],
      ),
    );
    const put = IDBObjectStore.prototype.put;
    let writes = 0,
      aborted = false;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.transaction.db.name === name && ++writes === 2)
        throw new DOMException('Injected transaction failure', 'QuotaExceededError');
      return put.apply(this, args);
    };
    try {
      await a.commitImport(graph);
    } catch {
      aborted = true;
    } finally {
      IDBObjectStore.prototype.put = put;
    }
    const afterAbort = (await a.list()).experiments.length;
    const invalid = structuredClone(graph) as any;
    invalid.experiments[1].routes[0].actions[0].moves = ['R3'];
    let rejected = false;
    try {
      await a.commitImport(invalid);
    } catch {
      rejected = true;
    }
    const afterInvalid = (await a.list()).experiments.length;
    await a.commitImport(graph);
    await a.commitImport(graph);
    const after = (await a.list()).experiments.length;
    a.close();
    b.close();
    return {
      before,
      race,
      storedLabel: afterRace.experiments[0].label,
      aborted,
      afterAbort,
      rejected,
      afterInvalid,
      after,
    };
  });
  expect(result).toEqual({
    before: 0,
    race: true,
    storedLabel: 'Another tab saved first',
    aborted: true,
    afterAbort: 1,
    rejected: true,
    afterInvalid: 1,
    after: 3,
  });
});
test('two fresh profiles round-trip route-only JSON and archived non-white playback after an explicit preview', async ({
  browser,
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto('club/#/lab');
  await dismissTutorialForTest(page);
  await page.getByLabel('Scramble sequence').fill('R U F2 L D2 B R2');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.locator('.lab-candidate').first()).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Stop analysis' }).click();
  await page.getByLabel('Experiment label (optional)').fill('Example transfer');
  await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
  await expect(page.getByText('Experiment saved on this device.', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('checkbox', { name: 'Export Example transfer', exact: true }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected JSON', exact: true }).click();
  const path = await (await download).path();
  expect(path).toBeTruthy();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected CSV', exact: true }).click();
  const csv = await readFile((await (await csvDownload).path())!, 'utf8');
  expect(csv).toContain('"route","');
  expect(csv).toContain('"setup_confirmed"');
  const other = await browser.newContext({
    baseURL: String(info.project.use.baseURL ?? 'http://127.0.0.1:5177/cube-steps/'),
  });
  const second = await other.newPage();
  await second.goto('club/#/lab');
  await dismissTutorialForTest(second);
  await second.getByLabel('Import experiment JSON').setInputFiles(path!);
  await expect(second.getByRole('heading', { name: 'Import preview', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(second.getByLabel('Saved experiments').locator('option')).toHaveCount(1);
  await second.getByRole('button', { name: 'Commit validated import', exact: true }).click();
  await expect(second.getByText('Import committed on this device.', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(second.getByLabel('Saved experiments').locator('option')).toHaveCount(2);
  await second.reload();
  await second
    .getByLabel('Saved experiments')
    .selectOption({ label: 'Example transfer · 1 route(s)' });
  await expect(second.getByRole('heading', { name: 'Pinned route', exact: true })).toBeVisible({
    timeout: 20000,
  });
  const archive = await page.evaluate(async () => {
    const hp = '/cube-steps/e2e/harnesses/lab-storage.ts',
      ep = '/cube-steps/src/lab/experiments/export.ts',
      sp = '/cube-steps/src/lab/experiments/schema.ts';
    const { storageFixture } = await import(/* @vite-ignore */ hp),
      { buildLabExport } = await import(/* @vite-ignore */ ep),
      { emptyLabData } = await import(/* @vite-ignore */ sp);
    const e = structuredClone(await storageFixture());
    e.id = 'archive-yellow';
    e.label = 'Example archive';
    e.routes = e.routes.filter((r: any) => r.startHold.bottom === 'yellow');
    if (!e.routes.length) throw Error('Missing non-white fixture');
    e.modelVersion = e.settings.modelVersion = 'old-model';
    for (const r of e.routes) {
      r.modelVersion = 'old-model';
      if (r.score.rated) r.score.modelVersion = 'old-model';
    }
    return buildLabExport(
      {
        ...emptyLabData(),
        experiments: [e],
        pending: [],
        error: '',
        conflicts: [],
        incompatibleCount: 0,
        incompatibleRecords: [],
      },
      { experimentIds: [e.id] },
    );
  });
  await second.getByLabel('Import experiment JSON').setInputFiles({
    name: 'archive.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  });
  await expect(
    second.getByText('Archived · not a current recommendation', { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await second.getByRole('button', { name: 'Commit validated import', exact: true }).click();
  await expect(second.getByText('Import committed on this device.', { exact: true })).toBeVisible();
  await second.getByLabel('Saved experiments').selectOption('archive-yellow');
  await expect(second.locator('.lab-player')).toContainText('Archived', { timeout: 20000 });
  await expect(second.locator('.lab-player')).toContainText('yellow');
  await second.locator('.lab-player .play-button').click();
  await expect(second.locator('.lab-player .play-button')).toContainText('Pause');
  await second.locator('.lab-player .play-button').click();
  archive.experiments[0].label = 'Conflicting archive label';
  const conflicting = {
    name: 'conflict.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  };
  await second.getByLabel('Import experiment JSON').setInputFiles(conflicting);
  await expect(second.getByRole('button', { name: 'Commit validated import' })).toBeDisabled();
  await second
    .getByRole('combobox', { name: /Conflict: Conflicting archive label/ })
    .selectOption('skip');
  await second.getByRole('button', { name: 'Commit validated import' }).click();
  await expect(second.getByLabel('Saved experiments').locator('option')).toHaveCount(3);
  await second.getByLabel('Import experiment JSON').setInputFiles(conflicting);
  await second
    .getByRole('combobox', { name: /Conflict: Conflicting archive label/ })
    .selectOption('import-copy');
  await second.getByRole('button', { name: 'Commit validated import' }).click();
  await expect(second.getByLabel('Saved experiments').locator('option')).toHaveCount(4);
  await other.close();
});
