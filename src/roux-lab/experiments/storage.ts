import {
  assertExperiment,
  assertComparison,
  assertBlock,
  assertTester,
  assertAttempt,
  assertGraph,
  assertRevisionHistory,
  emptyRouxNotebook,
  sameRouxValue,
  demand,
  IMMUTABLE_ATTEMPT_FIELDS,
} from './schema';
import { assertTransfer, recordKey, DATA_TABLES } from './transfer';
import { verifyExperiment } from './snapshots';
import type {
  RouxAttempt,
  RouxComparison,
  RouxNotebook,
  RouxDeleteToken,
  RouxExperiment,
  RouxStoredData,
  RouxTable,
  RouxTrialBlock,
  RouxTester,
} from './types';
export class RouxConflictError extends Error {
  constructor() {
    super('Changed in another tab. Refresh and deliberately reconcile your unsaved edit.');
    this.name = 'RouxConflictError';
  }
}
export interface RouxStore {
  list(): Promise<RouxStoredData>;
  saveExperiment(e: RouxExperiment): Promise<void>;
  saveComparison(c: RouxComparison): Promise<void>;
  saveBlocks(b: readonly RouxTrialBlock[]): Promise<void>;
  saveTester(t: RouxTester): Promise<void>;
  saveAttempt(a: RouxAttempt, expectedRevision: number | null): Promise<void>;
  softDeleteAttempt(id: string, expectedRevision: number): Promise<RouxDeleteToken>;
  undoDelete(token: RouxDeleteToken): Promise<void>;
  commitImport(data: RouxNotebook): Promise<void>;
  close(): void;
}
type RawData = Record<RouxTable, any[]>;
const validators = {
  experiments: assertExperiment,
  comparisons: assertComparison,
  trialBlocks: assertBlock,
  testers: assertTester,
  attempts: assertAttempt,
  attemptRevisions: assertAttempt,
};
const revisionKey = (a: RouxAttempt) => `${a.id}:${a.revision}`;
/** This store can open only the Roux database. CFOP and Timer connections never pass through it. */
export function openRouxStore(
  factory: IDBFactory = indexedDB,
  verify: (e: RouxExperiment) => Promise<unknown> = verifyExperiment,
): Promise<RouxStore> {
  return new Promise((resolve, reject) => {
    const request = factory.open('cubesteps.club.roux-lab', 1);
    let abandoned = false;
    request.onerror = () => reject(request.error ?? Error('Roux storage unavailable.'));
    request.onblocked = () => {
      abandoned = true;
      reject(Error('Roux storage is blocked by another tab. Close it and retry.'));
    };
    request.onupgradeneeded = () => {
      if (abandoned) {
        request.transaction?.abort();
        return;
      }
      for (const table of DATA_TABLES)
        request.result.createObjectStore(table, {
          keyPath: table === 'attemptRevisions' ? 'key' : 'id',
        });
    };
    request.onsuccess = () => {
      const db = request.result,
        admitted = new Map<string, RouxExperiment>();
      if (abandoned) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      function tx<T>(
        mode: IDBTransactionMode,
        run: (raw: RawData, t: IDBTransaction) => T,
      ): Promise<T> {
        return new Promise((resolveTx, rejectTx) => {
          let transaction: IDBTransaction;
          try {
            transaction = db.transaction([...DATA_TABLES], mode);
          } catch (e) {
            rejectTx(e);
            return;
          }
          let result: T, error: unknown;
          const raw = {} as RawData;
          let remaining = DATA_TABLES.length;
          transaction.oncomplete = () => resolveTx(result);
          transaction.onabort = () =>
            rejectTx(error ?? transaction.error ?? Error('Roux transaction aborted.'));
          transaction.onerror = () => {};
          for (const table of DATA_TABLES) {
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
      function clean(raw: RawData): RouxStoredData {
        const data = emptyRouxNotebook(),
          invalid: RouxStoredData['incompatibleRecords'] = [];
        const exclude = (table: RouxTable, value: unknown) => invalid.push({ table, value });
        for (const table of DATA_TABLES)
          for (const row of raw[table]) {
            const value = table === 'attemptRevisions' ? row?.attempt : row;
            try {
              validators[table](value);
              if (table === 'attemptRevisions')
                demand(row.key === revisionKey(value), 'Invalid revision key.');
              if (table === 'experiments')
                demand(
                  sameRouxValue(admitted.get(value.id), value),
                  'Snapshot has not passed physical replay.',
                );
              (data[table] as any[]).push(value);
            } catch {
              exclude(table, row);
            }
          }
        const keep = <T>(table: RouxTable, items: T[], test: (v: T) => boolean) =>
          items.filter((v) => {
            if (test(v)) return true;
            exclude(
              table,
              table === 'attemptRevisions' ? { key: revisionKey(v as RouxAttempt), attempt: v } : v,
            );
            return false;
          });
        const exp = new Map(data.experiments.map((e) => [e.id, e])),
          counts = new Map<string, number>();
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
        const references = (a: RouxAttempt) => {
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
        data.attempts = keep('attempts', data.attempts, (a) => {
          try {
            assertRevisionHistory({
              attempts: [a],
              attemptRevisions: data.attemptRevisions.filter((r) => r.id === a.id),
            });
            return true;
          } catch {
            return false;
          }
        });
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
            if (!sameRouxValue(admitted.get(e.id), e)) {
              await verify(e);
              admitted.set(e.id, structuredClone(e));
            }
          } catch {
            /* Preserve incompatible bytes for recovery export. */
          }
        return clean(raw);
      };
      async function mutate<T>(
        change: (data: RouxStoredData, raw: RawData) => { value: T; writes: Partial<RawData> },
      ): Promise<T> {
        await list();
        return tx('readwrite', (raw, t) => {
          const data = clean(raw),
            { value, writes } = change(data, raw);
          assertGraph(data);
          assertRevisionHistory(data);
          for (const table of DATA_TABLES)
            for (const row of writes[table] ?? [])
              t.objectStore(table).put(
                table === 'attemptRevisions' ? { key: revisionKey(row), attempt: row } : row,
              );
          return value;
        });
      }
      function immutable(raw: RawData, table: RouxTable, row: any) {
        const prev = raw[table].find((x) => x.id === row.id);
        if (prev && !sameRouxValue(prev, row)) throw new RouxConflictError();
      }
      function attemptChange(
        data: RouxStoredData,
        raw: RawData,
        a: RouxAttempt,
        expected: number | null,
      ): Partial<RawData> {
        assertAttempt(a);
        const head = raw.attempts.find((x) => x.id === a.id);
        if (expected === null ? head !== undefined : head?.revision !== expected)
          throw new RouxConflictError();
        demand(a.revision === (expected === null ? 0 : expected + 1), 'Invalid next revision.');
        if (head) {
          assertAttempt(head);
          for (const k of IMMUTABLE_ATTEMPT_FIELDS)
            demand(head[k] === a[k], 'Recorded conditions are immutable.');
        }
        if (raw.attemptRevisions.some((x) => x.key === revisionKey(a)))
          throw new RouxConflictError();
        const tester = data.testers.find((t) => t.id === a.testerId) ?? { id: a.testerId };
        if (!data.testers.some((t) => t.id === tester.id)) data.testers.push(tester);
        data.attempts = data.attempts.filter((x) => x.id !== a.id);
        data.attempts.push(a);
        data.attemptRevisions.push(a);
        return { attempts: [a], attemptRevisions: [a], testers: [tester] };
      }
      resolve({
        list,
        close: () => db.close(),
        async saveExperiment(value) {
          const e = structuredClone(value);
          assertExperiment(e);
          await verify(e);
          admitted.set(e.id, structuredClone(e));
          await mutate((data, raw) => {
            immutable(raw, 'experiments', e);
            if (!data.experiments.some((x) => x.id === e.id)) data.experiments.push(e);
            return { value: undefined, writes: { experiments: [e] } };
          });
        },
        async saveComparison(value) {
          const c = structuredClone(value);
          assertComparison(c);
          await mutate((data, raw) => {
            immutable(raw, 'comparisons', c);
            if (!data.comparisons.some((x) => x.id === c.id)) data.comparisons.push(c);
            return { value: undefined, writes: { comparisons: [c] } };
          });
        },
        async saveTester(value) {
          const t = structuredClone(value);
          assertTester(t);
          await mutate((data, raw) => {
            immutable(raw, 'testers', t);
            if (!data.testers.some((x) => x.id === t.id)) data.testers.push(t);
            return { value: undefined, writes: { testers: [t] } };
          });
        },
        async saveBlocks(value) {
          const blocks = structuredClone(value);
          blocks.forEach(assertBlock);
          await mutate((data, raw) => {
            for (const b of blocks) {
              immutable(raw, 'trialBlocks', b);
              if (!data.trialBlocks.some((x) => x.id === b.id)) data.trialBlocks.push(b);
            }
            return { value: undefined, writes: { trialBlocks: [...blocks] } };
          });
        },
        async saveAttempt(value, expected) {
          const a = structuredClone(value);
          await mutate((data, raw) => ({
            value: undefined,
            writes: attemptChange(data, raw, a, expected),
          }));
        },
        async softDeleteAttempt(id, expected) {
          return mutate((data, raw) => {
            const old = data.attempts.find((x) => x.id === id);
            if (!old || old.revision !== expected) throw new RouxConflictError();
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
              writes: attemptChange(data, raw, a, expected),
            };
          });
        },
        async undoDelete(token) {
          await mutate((data, raw) => {
            const old = data.attempts.find((x) => x.id === token.id);
            if (!old || old.revision !== token.revision || !old.deletedAt)
              throw new RouxConflictError();
            const a = {
              ...old,
              revision: old.revision + 1,
              previousRevision: old.revision,
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            };
            return { value: undefined, writes: attemptChange(data, raw, a, old.revision) };
          });
        },
        async commitImport(value) {
          const copy = structuredClone(value);
          assertTransfer({
            kind: 'cubesteps-roux-notebook',
            schemaVersion: 1,
            method: 'roux-advanced',
            exportedAt: new Date().toISOString(),
            ...copy,
          });
          for (const e of copy.experiments) {
            await verify(e);
            admitted.set(e.id, structuredClone(e));
          }
          await mutate((data, raw) => {
            const writes: Partial<RawData> = {};
            for (const table of DATA_TABLES)
              for (const row of copy[table]) {
                const key = recordKey(table, row),
                  existing = raw[table].find(
                    (x) => (table === 'attemptRevisions' ? x.key : x.id) === key,
                  );
                if (
                  existing &&
                  !sameRouxValue(table === 'attemptRevisions' ? existing.attempt : existing, row)
                )
                  throw new RouxConflictError();
                if (!existing) {
                  (data[table] as any[]).push(row);
                  (writes[table] ??= []).push(row);
                }
              }
            return { value: undefined, writes };
          });
        },
      });
    };
  });
}
