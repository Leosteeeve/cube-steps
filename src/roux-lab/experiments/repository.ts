import { freezeLabValue } from '../../lab/input';
import {
  assertExperiment,
  assertComparison,
  assertBlock,
  assertAttempt,
  assertTester,
  emptyRouxNotebook,
} from './schema';
import { openRouxStore, type RouxStore } from './storage';
import type {
  RouxAttempt,
  RouxComparison,
  RouxDeleteToken,
  RouxExperiment,
  RouxPending,
  RouxRepositorySnapshot,
  RouxStoredData,
  RouxTrialBlock,
  RouxTester,
  RouxNotebook,
} from './types';
export function createRouxRepository(open: () => Promise<RouxStore> = openRouxStore) {
  let saved: RouxStoredData = {
      ...emptyRouxNotebook(),
      incompatibleCount: 0,
      incompatibleRecords: [],
    },
    error = '',
    epoch = 0,
    disposed = false,
    connection: Promise<RouxStore> | undefined;
  const pending = new Map<string, RouxPending>(),
    jobs = new Map<string, (s: RouxStore) => Promise<unknown>>(),
    writing = new Map<string, Promise<void>>(),
    active = new Set<Promise<unknown>>(),
    listeners = new Set<() => void>();
  const channel =
    typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('cubesteps.club.roux-lab.v1')
      : null;
  const connect = () =>
    (connection ??= open().catch((e) => {
      connection = undefined;
      throw e;
    }));
  const snapshot = (): RouxRepositorySnapshot =>
    freezeLabValue(
      structuredClone({
        ...saved,
        pending: [...pending.values()],
        error,
        conflicts: [...pending.values()].filter((p) => p.conflict).map((p) => p.id),
      }),
    );
  const emit = () => {
    if (!disposed) for (const fn of listeners) fn();
  };
  const track = <T>(p: Promise<T>) => {
    active.add(p);
    void p.then(
      () => active.delete(p),
      () => active.delete(p),
    );
    return p;
  };
  function resetConnection(e: unknown) {
    if (e instanceof Error && e.name === 'InvalidStateError') {
      void connection?.then(
        (s) => s.close(),
        () => {},
      );
      connection = undefined;
    }
  }
  async function refresh() {
    if (disposed) return;
    const ticket = ++epoch;
    try {
      const next = await (await connect()).list();
      if (ticket === epoch) {
        saved = next;
        if (!pending.size) error = '';
        emit();
      }
    } catch (e) {
      resetConnection(e);
      if (ticket === epoch) {
        error = e instanceof Error ? e.message : String(e);
        emit();
      }
    }
  }
  function run(id: string): Promise<void> {
    if (disposed) return Promise.reject(Error('Roux notebook is closed.'));
    if (writing.has(id)) return writing.get(id)!;
    const item = pending.get(id),
      job = jobs.get(id);
    if (!item || !job) return Promise.resolve();
    if (item.conflict)
      return Promise.reject(
        Error('Refresh and reconcile this edit; retry will not overwrite another revision.'),
      );
    const operation = track(
      (async () => {
        try {
          await job(await connect());
          pending.delete(id);
          jobs.delete(id);
          ++epoch;
          channel?.postMessage('changed');
          if (!disposed) await refresh();
        } catch (e) {
          resetConnection(e);
          const message = e instanceof Error ? e.message : String(e),
            conflict = e instanceof Error && e.name === 'RouxConflictError';
          pending.set(id, { ...item, error: message, conflict });
          error = message;
          if (conflict && !disposed) await refresh();
          emit();
          throw e;
        } finally {
          writing.delete(id);
          emit();
        }
      })(),
    );
    writing.set(id, operation);
    return operation;
  }
  function save(item: RouxPending, job: (s: RouxStore) => Promise<unknown>) {
    if (disposed) return Promise.reject(Error('Roux notebook is closed.'));
    if (pending.has(item.id))
      return Promise.reject(
        Error('An unsaved operation already uses this ID. Retry or reconcile it first.'),
      );
    pending.set(item.id, freezeLabValue(structuredClone(item)));
    jobs.set(item.id, job);
    emit();
    return run(item.id);
  }
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (pending.size || active.size) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', beforeUnload);
  if (channel) channel.onmessage = () => void refresh();
  return {
    snapshot,
    refresh,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    retry: run,
    saveExperiment(e: RouxExperiment) {
      assertExperiment(e);
      const copy = structuredClone(e);
      return save({ id: e.id, table: 'experiments', records: [copy] }, (s) =>
        s.saveExperiment(copy),
      );
    },
    saveComparison(c: RouxComparison) {
      assertComparison(c);
      const copy = structuredClone(c);
      return save({ id: c.id, table: 'comparisons', records: [copy] }, (s) =>
        s.saveComparison(copy),
      );
    },
    saveBlocks(blocks: readonly RouxTrialBlock[]) {
      blocks.forEach(assertBlock);
      if (!blocks.length) return Promise.resolve();
      const copy = structuredClone(blocks);
      return save({ id: blocks[0].id, table: 'trialBlocks', records: copy }, (s) =>
        s.saveBlocks(copy),
      );
    },
    saveTester(t: RouxTester) {
      assertTester(t);
      const copy = structuredClone(t);
      return save({ id: t.id, table: 'testers', records: [copy] }, (s) => s.saveTester(copy));
    },
    saveAttempt(a: RouxAttempt, expected: number | null) {
      assertAttempt(a);
      const copy = structuredClone(a);
      return save({ id: a.id, table: 'attempts', records: [copy] }, (s) =>
        s.saveAttempt(copy, expected),
      );
    },
    discardPending(id: string) {
      if (writing.has(id)) throw Error('Wait for the write before discarding.');
      pending.delete(id);
      jobs.delete(id);
      if (!pending.size) error = '';
      emit();
    },
    async softDeleteAttempt(id: string, expected: number) {
      const head = saved.attempts.find((a) => a.id === id),
        now = new Date().toISOString(),
        records = head
          ? [
              {
                ...head,
                revision: expected + 1,
                previousRevision: expected,
                updatedAt: now,
                deletedAt: now,
              },
            ]
          : [];
      let token: RouxDeleteToken = { id, revision: expected + 1 };
      await save({ id, table: 'attempts', records }, async (s) => {
        token = await s.softDeleteAttempt(id, expected);
      });
      return token;
    },
    async undoDelete(token: RouxDeleteToken) {
      const head = saved.attempts.find((a) => a.id === token.id),
        records = head
          ? [
              {
                ...head,
                revision: token.revision + 1,
                previousRevision: token.revision,
                updatedAt: new Date().toISOString(),
                deletedAt: null,
              },
            ]
          : [];
      await save({ id: token.id, table: 'attempts', records }, (s) => s.undoDelete(token));
    },
    async commitImport(data: RouxNotebook) {
      if (disposed) throw Error('Roux notebook is closed.');
      const copy = structuredClone(data);
      await track(
        (async () => {
          try {
            await (await connect()).commitImport(copy);
            ++epoch;
            channel?.postMessage('changed');
            await refresh();
          } catch (e) {
            resetConnection(e);
            await refresh();
            throw e;
          }
        })(),
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      channel?.close();
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload);
      void Promise.allSettled([...active]).then(() =>
        connection?.then(
          (s) => s.close(),
          () => {},
        ),
      );
    },
  };
}
export type RouxRepository = ReturnType<typeof createRouxRepository>;
