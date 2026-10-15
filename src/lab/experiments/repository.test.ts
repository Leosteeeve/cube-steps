import { beforeAll, expect, it, vi } from 'vitest';
import { createLabRepository } from './repository';
import { emptyLabData } from './schema';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import type { LabStore } from './storage';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
const loaded = () => ({ ...emptyLabData(), incompatibleCount: 0, incompatibleRecords: [] });
function store() {
  const data = loaded();
  return {
    data,
    list: vi.fn(async () => structuredClone(data)),
    saveExperiment: vi.fn(async (e: any) => {
      data.experiments.push(e);
    }),
    saveComparison: vi.fn(async () => {}),
    saveBlocks: vi.fn(async () => {}),
    saveAttempt: vi.fn(async () => {}),
    softDeleteAttempt: vi.fn(),
    undoDelete: vi.fn(async () => {}),
    close: vi.fn(),
  } as unknown as LabStore & { data: ReturnType<typeof loaded> };
}
it('retains pending values after abort, retries same ID and reports success only after commit', async () => {
  const s = store(),
    r = createLabRepository(async () => s);
  let finish!: () => void;
  vi.mocked(s.saveExperiment).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = r.saveExperiment(f.experiment);
  await vi.waitFor(() => expect(finish).toBeDefined());
  expect(r.snapshot().pending[0].records[0]).toEqual(f.experiment);
  expect(r.snapshot().experiments).toHaveLength(0);
  finish();
  await pending;
  expect(r.snapshot().pending).toHaveLength(0);
  vi.mocked(s.saveExperiment).mockRejectedValueOnce(Error('transaction aborted'));
  await expect(r.saveExperiment(f.experiment)).rejects.toThrow('aborted');
  expect(r.snapshot().pending[0].records[0]).toEqual(f.experiment);
  await r.refresh();
  expect(r.snapshot().pending).toHaveLength(1);
  await r.retry(f.experiment.id);
  expect(r.snapshot().pending).toHaveLength(0);
  expect(vi.mocked(s.saveExperiment).mock.calls.every((c) => c[0].id === f.experiment.id)).toBe(
    true,
  );
  r.dispose();
});
it('keeps pending edits separate from a refreshed conflicting head', async () => {
  const s = store(),
    a = attemptFixture(f.experiment.id, f.experiment.routes[0].id);
  s.data.attempts = [a];
  const r = createLabRepository(async () => s);
  await r.refresh();
  vi.mocked(s.saveAttempt).mockRejectedValueOnce(
    Object.assign(Error('Changed in another tab'), { name: 'LabConflictError' }),
  );
  const edit = { ...a, revision: 1, previousRevision: 0, note: 'my correction' };
  await expect(r.saveAttempt(edit, 0)).rejects.toThrow();
  expect(r.snapshot().attempts[0].revision).toBe(0);
  expect(r.snapshot().pending[0].records[0]).toEqual(edit);
  expect(r.snapshot().conflicts).toContain(a.id);
  await expect(r.retry(a.id)).rejects.toThrow(/reconcile/i);
  r.dispose();
});
it('does not let a delayed refresh erase a committed result or pending recovery', async () => {
  const s = store(),
    r = createLabRepository(async () => s);
  let resolve!: (v: any) => void;
  vi.mocked(s.list).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const refresh = r.refresh();
  await vi.waitFor(() => expect(resolve).toBeDefined());
  await r.saveExperiment(f.experiment);
  resolve(loaded());
  await refresh;
  expect(r.snapshot().experiments).toHaveLength(1);
  r.dispose();
});
it('forwards revision-checked delete/undo and waits for pending writes before closing', async () => {
  const s = store(),
    r = createLabRepository(async () => s);
  let finish!: () => void;
  vi.mocked(s.saveExperiment).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const p = r.saveExperiment(f.experiment);
  await vi.waitFor(() => expect(finish).toBeDefined());
  r.dispose();
  expect(s.close).not.toHaveBeenCalled();
  finish();
  await p;
  await vi.waitFor(() => expect(s.close).toHaveBeenCalled());
  const r2 = createLabRepository(async () => s);
  vi.mocked(s.softDeleteAttempt).mockResolvedValue({ id: 'attempt', revision: 2 });
  const token = await r2.softDeleteAttempt('attempt', 1);
  expect(s.softDeleteAttempt).toHaveBeenCalledWith('attempt', 1);
  await r2.undoDelete(token);
  expect(s.undoDelete).toHaveBeenCalledWith(token);
  r2.dispose();
});
it('keeps a failed deletion recoverable and requires a deliberate discard for conflicts', async () => {
  const s = store(),
    a = attemptFixture(f.experiment.id, f.experiment.routes[0].id);
  s.data.attempts = [a];
  const r = createLabRepository(async () => s);
  await r.refresh();
  vi.mocked(s.softDeleteAttempt).mockRejectedValueOnce(Error('transaction aborted'));
  await expect(r.softDeleteAttempt(a.id, 0)).rejects.toThrow();
  expect(r.snapshot().pending[0].records[0]).toMatchObject({ id: a.id, revision: 1 });
  r.discardPending(a.id);
  expect(r.snapshot().pending).toHaveLength(0);
  expect(r.snapshot().attempts[0].deletedAt).toBeNull();
  r.dispose();
});
