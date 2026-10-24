import { beforeAll, expect, it, vi } from 'vitest';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import { emptyRouxNotebook } from './schema';
import { createRouxRepository } from './repository';
import type { RouxStore } from './storage';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
function store() {
  const data = { ...emptyRouxNotebook(), incompatibleCount: 0, incompatibleRecords: [] };
  return {
    data,
    list: vi.fn(async () => structuredClone(data)),
    saveExperiment: vi.fn(async (e: any) => {
      data.experiments.push(e);
    }),
    saveComparison: vi.fn(async () => {}),
    saveBlocks: vi.fn(async () => {}),
    saveTester: vi.fn(async () => {}),
    saveAttempt: vi.fn(async () => {}),
    softDeleteAttempt: vi.fn(),
    undoDelete: vi.fn(),
    commitImport: vi.fn(),
    close: vi.fn(),
  } as unknown as RouxStore & { data: typeof data };
}
it('retains unsaved bytes after transaction abort and retries the same ID only after commit', async () => {
  const s = store(),
    r = createRouxRepository(async () => s);
  let finish!: () => void;
  vi.mocked(s.saveExperiment).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const job = r.saveExperiment(f.experiment);
  await vi.waitFor(() => expect(finish).toBeDefined());
  expect(r.snapshot().experiments).toHaveLength(0);
  expect(r.snapshot().pending[0].records[0]).toEqual(f.experiment);
  finish();
  await job;
  expect(r.snapshot().pending).toHaveLength(0);
  vi.mocked(s.saveExperiment).mockRejectedValueOnce(
    new DOMException('Quota exceeded', 'QuotaExceededError'),
  );
  await expect(r.saveExperiment(f.experiment)).rejects.toThrow();
  await r.refresh();
  expect(r.snapshot().pending).toHaveLength(1);
  await r.retry(f.experiment.id);
  expect(r.snapshot().pending).toHaveLength(0);
  r.dispose();
});
it('preserves a conflicting edit without retrying over another tab revision', async () => {
  const s = store(),
    a = attemptFixture(f.experiment.id, f.experiment.routes[0].id);
  s.data.attempts = [a];
  const r = createRouxRepository(async () => s);
  await r.refresh();
  vi.mocked(s.saveAttempt).mockRejectedValueOnce(
    Object.assign(Error('Changed elsewhere'), { name: 'RouxConflictError' }),
  );
  const edit = { ...a, revision: 1, previousRevision: 0, note: 'Keep my edit' };
  await expect(r.saveAttempt(edit, 0)).rejects.toThrow();
  expect(r.snapshot().pending[0].records[0]).toEqual(edit);
  expect(r.snapshot().attempts[0].revision).toBe(0);
  await expect(r.retry(a.id)).rejects.toThrow(/reconcile/i);
  r.dispose();
});
it('keeps an unavailable store error recoverable and closes after active writes finish', async () => {
  const s = store(),
    open = vi
      .fn<() => Promise<RouxStore>>()
      .mockRejectedValueOnce(Error('No IndexedDB'))
      .mockResolvedValue(s),
    r = createRouxRepository(open);
  await r.refresh();
  expect(r.snapshot().error).toContain('No IndexedDB');
  await r.refresh();
  expect(r.snapshot().error).toBe('');
  r.dispose();
  await vi.waitFor(() => expect(s.close).toHaveBeenCalledOnce());
});
