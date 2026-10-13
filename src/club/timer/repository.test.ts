import { afterEach, expect, it, vi } from 'vitest';
import { createTimerRepository, type TimerRepository } from './repository';
import type { TimerStore } from './storage';
import type { TimerAttempt } from './types';
const attempt: TimerAttempt = {
  version: 1,
  id: 'one',
  createdAt: '2026-10-13T00:00:00.000Z',
  rawMs: 10000,
  scramble: 'R U',
  inspectionMs: null,
  inspectionPenalty: 'none',
  manualPenalty: 'none',
  interruption: null,
  revision: 0,
  deletedAt: null,
};
const repos: TimerRepository[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.dispose()));
function fixture() {
  let fail = true;
  const rows = new Map<string, TimerAttempt>();
  const store: TimerStore = {
    list: vi.fn(async () => ({ attempts: [...rows.values()], invalidCount: 0 })),
    add: vi.fn(async (a) => {
      if (fail) throw new Error('quota');
      rows.set(a.id, a);
    }),
    updatePenalty: vi.fn(),
    softDelete: vi.fn(),
    undoDelete: vi.fn(),
    close: vi.fn(),
  };
  const open = vi.fn(async () => store);
  const repo = createTimerRepository(open);
  repos.push(repo);
  return {
    repo,
    open,
    store,
    rows,
    recover() {
      fail = false;
    },
  };
}
it('retains failed saves for export, retries once and deduplicates effects', async () => {
  const f = fixture();
  await f.repo.record(attempt);
  await f.repo.record(attempt);
  expect(f.repo.snapshot()).toMatchObject({ attempts: [attempt], pendingIds: ['one'] });
  expect(f.repo.snapshot().error).toContain('Not saved');
  f.recover();
  await Promise.all([f.repo.retry('one'), f.repo.retry('one')]);
  expect(f.repo.snapshot()).toMatchObject({ attempts: [attempt], pendingIds: [], error: '' });
  expect(f.rows.size).toBe(1);
  expect(f.open).toHaveBeenCalledTimes(1);
});
it('reopens after a failed open and closes only after writes settle', async () => {
  const f = fixture();
  f.recover();
  const open = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(f.store);
  const repo = createTimerRepository(open);
  repos.push(repo);
  await repo.record(attempt);
  expect(repo.snapshot().pendingIds).toEqual(['one']);
  let finish!: () => void;
  vi.mocked(f.store.add).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const saving = repo.retry('one');
  await vi.waitFor(() => expect(finish).toBeDefined());
  repo.dispose();
  expect(f.store.close).not.toHaveBeenCalled();
  finish();
  await saving;
  await vi.waitFor(() => expect(f.store.close).toHaveBeenCalledTimes(1));
  expect(repo.snapshot().error).toBe('');
  expect(open).toHaveBeenCalledTimes(2);
});
it('a stale load cannot erase pending or a newly saved attempt', async () => {
  const f = fixture();
  let finish!: (v: { attempts: TimerAttempt[]; invalidCount: number }) => void;
  vi.mocked(f.store.list).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const loading = f.repo.refresh();
  await vi.waitFor(() => expect(finish).toBeDefined());
  await f.repo.record(attempt);
  expect(f.repo.snapshot().attempts).toEqual([attempt]);
  f.recover();
  await f.repo.retry('one');
  finish({ attempts: [], invalidCount: 0 });
  await loading;
  expect(f.repo.snapshot().attempts).toEqual([attempt]);
});
it('conflicts refresh newer history without discarding unsaved records', async () => {
  const f = fixture();
  f.recover();
  await f.repo.record(attempt);
  const newer = { ...attempt, manualPenalty: 'plus2' as const, revision: 1 };
  f.rows.set(attempt.id, newer);
  vi.mocked(f.store.updatePenalty).mockRejectedValueOnce(
    new Error('Changed in another tab. Refresh and try again.'),
  );
  await expect(f.repo.updatePenalty('one', 0, 'dnf')).rejects.toThrow('another tab');
  expect(f.repo.snapshot().attempts).toEqual([newer]);
});
