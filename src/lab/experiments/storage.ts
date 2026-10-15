import {
  assertExperiment,
  assertComparison,
  assertBlock,
  assertTester,
  assertAttempt,
  assertGraph,
  emptyLabData,
  sameLabValue,
  demand,
} from './schema';
import { verifyExperiment } from './snapshots';
import type {
  LabAttempt,
  LabComparison,
  LabData,
  LabDeleteToken,
  LabExperiment,
  LabStoredData,
  LabTable,
  TrialBlock,
  LabTester,
} from './types';
export const LAB_TABLES: LabTable[] = [
  'experiments',
  'comparisons',
  'trialBlocks',
  'testers',
  'attempts',
  'attemptRevisions',
];
export class LabConflictError extends Error {
  constructor() {
    super('Changed in another tab. Refresh and deliberately reconcile your unsaved edit.');
    this.name = 'LabConflictError';
  }
}
export interface LabStore {
  saveTester(t: LabTester): Promise<void>;
  list(): Promise<LabStoredData>;
  saveExperiment(e: LabExperiment): Promise<void>;
  saveComparison(c: LabComparison): Promise<void>;
  saveBlocks(b: readonly TrialBlock[]): Promise<void>;
  saveAttempt(a: LabAttempt, expectedRevision: number | null): Promise<void>;
  softDeleteAttempt(id: string, expectedRevision: number): Promise<LabDeleteToken>;
  undoDelete(token: LabDeleteToken): Promise<void>;
  close(): void;
}
const validators = {
  experiments: assertExperiment,
  comparisons: assertComparison,
  trialBlocks: assertBlock,
  testers: assertTester,
  attempts: assertAttempt,
  attemptRevisions: assertAttempt,
};
type RawData = Record<LabTable, any[]>;
const revisionKey = (a: LabAttempt) => `${a.id}:${a.revision}`;
export function openLabStore(
  factory: IDBFactory = indexedDB,
  verify: (e: LabExperiment) => Promise<unknown> = async (e) => {
    const { loadLabContext } = await import('../../workers/lab-request');
    return verifyExperiment(await loadLabContext(), e);
  },
  name = 'cubesteps.club.lab',
): Promise<LabStore> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    let abandoned = false;
    request.onblocked = () => {
      abandoned = true;
      reject(Error('Lab storage is blocked by another tab. Close that connection and retry.'));
    };
    request.onerror = () => reject(request.error ?? Error('Lab storage unavailable.'));
    request.onupgradeneeded = () => {
      if (abandoned) {
        request.transaction?.abort();
        return;
      }
      for (const table of LAB_TABLES)
        request.result.createObjectStore(table, {
          keyPath: table === 'attemptRevisions' ? 'key' : 'id',
        });
    };
    request.onsuccess = () => {
      const db = request.result,
        admitted = new Map<string, LabExperiment>();
      if (abandoned) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      function tx<T>(
        mode: IDBTransactionMode,
        run: (data: RawData, transaction: IDBTransaction) => T,
      ): Promise<T> {
        return new Promise((resolveTx, rejectTx) => {
          let transaction: IDBTransaction;
          try {
            transaction = db.transaction(LAB_TABLES, mode);
          } catch (e) {
            rejectTx(e);
            return;
          }
          let result: T, error: unknown;
          const raw = {} as RawData;
          let remaining = LAB_TABLES.length;
          transaction.oncomplete = () => resolveTx(result);
          transaction.onabort = () =>
            rejectTx(error ?? transaction.error ?? Error('Lab transaction aborted.'));
          transaction.onerror = () => {};
          for (const table of LAB_TABLES) {
            const q = transaction.objectStore(table).getAll();
            q.onsuccess = () => {
              raw[table] = q.result;
              if (--remaining === 0)
                try {
                  result = run(raw, transaction);
                } catch (e) {
                  error = e;
                  transaction.abort();
                }
            };
          }
        });
      }
      function clean(raw: RawData): LabStoredData {
        const data = emptyLabData(),
          invalid: LabStoredData['incompatibleRecords'] = [];
        const exclude = (table: LabTable, value: unknown) => invalid.push({ table, value });
        for (const table of LAB_TABLES)
          for (const row of raw[table]) {
            const v = table === 'attemptRevisions' ? row?.attempt : row;
            try {
              validators[table](v);
              if (table === 'attemptRevisions')
                demand(row.key === revisionKey(v), 'Invalid revision key.');
              if (table === 'experiments')
                demand(
                  sameLabValue(admitted.get(v.id), v),
                  'Snapshot has not passed physical replay.',
                );
              (data[table] as any[]).push(v);
            } catch {
              exclude(table, row);
            }
          }
        const keep = <T>(table: LabTable, items: T[], test: (v: T) => boolean): T[] =>
          items.filter((v) => {
            if (test(v)) return true;
            exclude(
              table,
              table === 'attemptRevisions' ? { key: revisionKey(v as LabAttempt), attempt: v } : v,
            );
            return false;
          });
        const exp = new Map(data.experiments.map((e) => [e.id, e]));
        const counts = new Map<string, number>();
        data.comparisons = keep('comparisons', data.comparisons, (c) => {
          const e = exp.get(c.experimentId),
            count = (counts.get(c.experimentId) ?? 0) + 1;
          counts.set(c.experimentId, count);
          return (
            !!e &&
            count <= 6 &&
            [c.routeAId, c.routeBId].every((id) => e.routes.some((r) => r.id === id))
          );
        });
        const comp = new Map(data.comparisons.map((c) => [c.id, c])),
          slots = new Set<string>(),
          ordinals = new Set<string>();
        data.trialBlocks = keep('trialBlocks', data.trialBlocks, (b) => {
          const c = comp.get(b.comparisonId);
          if (
            !c ||
            b.slots[0].routeId !== c.routeAId ||
            b.slots[1].routeId !== c.routeBId ||
            b.slots.some((s) => slots.has(s.id)) ||
            ordinals.has(`${b.comparisonId}:${b.ordinal}`)
          )
            return false;
          b.slots.forEach((s) => slots.add(s.id));
          ordinals.add(`${b.comparisonId}:${b.ordinal}`);
          return true;
        });
        const blocks = new Map(data.trialBlocks.map((b) => [b.id, b])),
          testers = new Set(data.testers.map((t) => t.id));
        const references = (a: LabAttempt) => {
          if (
            !exp.get(a.experimentId)?.routes.some((r) => r.id === a.routeId) ||
            !testers.has(a.testerId)
          )
            return false;
          if (a.blockId) {
            const b = blocks.get(a.blockId),
              c = comp.get(a.comparisonId!);
            if (
              !b ||
              !c ||
              b.comparisonId !== c.id ||
              c.experimentId !== a.experimentId ||
              b.intendedOrder !== a.intendedOrder ||
              !b.slots.some((s) => s.id === a.slot && s.routeId === a.routeId)
            )
              return false;
          }
          return true;
        };
        data.attempts = keep('attempts', data.attempts, references);
        let changed = true;
        while (changed) {
          const before = data.attempts.length,
            heads = new Map(data.attempts.map((a) => [a.id, a]));
          data.attempts = keep('attempts', data.attempts, (a) => {
            let p = a;
            const seen = new Set([a.id]);
            while (p.retryOf) {
              const prev = heads.get(p.retryOf);
              if (
                !prev ||
                seen.has(prev.id) ||
                prev.createdAt > p.createdAt ||
                ['experimentId', 'routeId', 'testerId', 'timingMethod', 'blockId', 'slot'].some(
                  (k) => (prev as any)[k] !== (p as any)[k],
                )
              )
                return false;
              seen.add(prev.id);
              p = prev;
            }
            return true;
          });
          changed = before !== data.attempts.length;
        }
        const heads = new Map(data.attempts.map((a) => [a.id, a]));
        data.attemptRevisions = keep(
          'attemptRevisions',
          data.attemptRevisions,
          (a) => references(a) && !!heads.get(a.id) && a.revision <= heads.get(a.id)!.revision,
        );
        return { ...data, incompatibleCount: invalid.length, incompatibleRecords: invalid };
      }
      const list = async () => {
        const raw = await tx('readonly', (r) => r);
        for (const e of raw.experiments)
          try {
            assertExperiment(e);
            if (!sameLabValue(admitted.get(e.id), e)) {
              await verify(e);
              admitted.set(e.id, structuredClone(e));
            }
          } catch {
            /* Preserve incompatible bytes. */
          }
        return clean(raw);
      };
      async function mutate<T>(
        change: (
          data: LabStoredData,
          raw: RawData,
        ) => { value: T; writes: Partial<Record<LabTable, any[]>> },
      ): Promise<T> {
        await list();
        return tx('readwrite', (raw, transaction) => {
          const data = clean(raw),
            { value, writes } = change(data, raw);
          assertGraph(data);
          for (const table of LAB_TABLES)
            for (const row of writes[table] ?? [])
              transaction
                .objectStore(table)
                .put(table === 'attemptRevisions' ? { key: revisionKey(row), attempt: row } : row);
          return value;
        });
      }
      function immutable(raw: RawData, table: LabTable, row: any) {
        const existing = raw[table].find((x) => x.id === row.id);
        if (existing && !sameLabValue(existing, row)) throw new LabConflictError();
      }
      const saveAttemptChange = (
        data: LabStoredData,
        raw: RawData,
        a: LabAttempt,
        expected: number | null,
      ) => {
        assertAttempt(a);
        const head = raw.attempts.find((x) => x.id === a.id);
        if (expected === null ? head !== undefined : head?.revision !== expected)
          throw new LabConflictError();
        demand(a.revision === (expected === null ? 0 : expected + 1), 'Invalid next revision.');
        if (head) {
          assertAttempt(head);
          for (const k of [
            'createdAt',
            'experimentId',
            'routeId',
            'testerId',
            'timingMethod',
            'endpoint',
            'comparisonId',
            'blockId',
            'slot',
            'retryOf',
            'intendedOrder',
            'actualOrder',
          ])
            demand((head as any)[k] === (a as any)[k], 'Recorded conditions are immutable.');
        }
        const existingRevision = raw.attemptRevisions.find((x) => x.key === revisionKey(a));
        if (existingRevision) throw new LabConflictError();
        const tester = data.testers.find((t) => t.id === a.testerId) ?? { id: a.testerId };
        if (!data.testers.some((t) => t.id === tester.id)) data.testers.push(tester);
        data.attempts = data.attempts.filter((x) => x.id !== a.id);
        data.attempts.push(a);
        data.attemptRevisions.push(a);
        return { attempts: [a], attemptRevisions: [a], testers: [tester] };
      };
      resolve({
        async saveTester(t) {
          assertTester(t);
          await mutate((data, raw) => {
            immutable(raw, 'testers', t);
            if (!data.testers.some((x) => x.id === t.id)) data.testers.push(t);
            return { value: undefined, writes: { testers: [t] } };
          });
        },
        list,
        close: () => db.close(),
        async saveExperiment(e) {
          assertExperiment(e);
          await verify(e);
          admitted.set(e.id, structuredClone(e));
          await mutate((data, raw) => {
            immutable(raw, 'experiments', e);
            if (!data.experiments.some((x) => x.id === e.id)) data.experiments.push(e);
            return { value: undefined, writes: { experiments: [e] } };
          });
        },
        async saveComparison(c) {
          assertComparison(c);
          await mutate((data, raw) => {
            immutable(raw, 'comparisons', c);
            if (!data.comparisons.some((x) => x.id === c.id)) data.comparisons.push(c);
            return { value: undefined, writes: { comparisons: [c] } };
          });
        },
        async saveBlocks(blocks) {
          blocks.forEach(assertBlock);
          await mutate((data, raw) => {
            for (const b of blocks) {
              immutable(raw, 'trialBlocks', b);
              if (!data.trialBlocks.some((x) => x.id === b.id)) data.trialBlocks.push(b);
            }
            return { value: undefined, writes: { trialBlocks: [...blocks] } };
          });
        },
        async saveAttempt(a, expected) {
          await mutate((data, raw) => ({
            value: undefined,
            writes: saveAttemptChange(data, raw, a, expected),
          }));
        },
        async softDeleteAttempt(id, expected) {
          return mutate((data, raw) => {
            const old = data.attempts.find((x) => x.id === id);
            if (!old || old.revision !== expected) throw new LabConflictError();
            const now = new Date().toISOString(),
              a = {
                ...old,
                revision: expected + 1,
                previousRevision: expected,
                updatedAt: now,
                deletedAt: now,
              };
            return {
              value: { id, revision: a.revision },
              writes: saveAttemptChange(data, raw, a, expected),
            };
          });
        },
        async undoDelete(token) {
          await mutate((data, raw) => {
            const old = data.attempts.find((x) => x.id === token.id);
            if (!old || old.revision !== token.revision || !old.deletedAt)
              throw new LabConflictError();
            const a = {
              ...old,
              revision: old.revision + 1,
              previousRevision: old.revision,
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            };
            return { value: undefined, writes: saveAttemptChange(data, raw, a, old.revision) };
          });
        },
      });
    };
  });
}
