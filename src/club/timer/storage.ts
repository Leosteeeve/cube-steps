import { parseScramble } from '../../core/notation';
import type { Penalty, TimerAttempt } from './types';
export type DeleteToken = { id: string; revision: number };
export interface TimerStore {
  list(): Promise<{ attempts: TimerAttempt[]; invalidCount: number }>;
  add(attempt: TimerAttempt): Promise<void>;
  updatePenalty(id: string, expectedRevision: number, penalty: Penalty): Promise<TimerAttempt>;
  softDelete(id: string, expectedRevision: number, deletedAt: string): Promise<DeleteToken>;
  undoDelete(token: DeleteToken): Promise<boolean>;
  close(): void;
}
const validTime = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const validMs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const validPenalty = (v: unknown): v is Penalty => v === 'none' || v === 'plus2' || v === 'dnf';
export function isTimerAttempt(value: unknown): value is TimerAttempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as TimerAttempt;
  if (
    a.version !== 1 ||
    typeof a.id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(a.id) ||
    !validTime(a.createdAt) ||
    !validMs(a.rawMs) ||
    typeof a.scramble !== 'string' ||
    a.scramble.length > 10000
  )
    return false;
  const parsed = parseScramble(a.scramble);
  return (
    parsed.ok &&
    parsed.moves.length > 0 &&
    (a.inspectionMs === null || validMs(a.inspectionMs)) &&
    validPenalty(a.inspectionPenalty) &&
    validPenalty(a.manualPenalty) &&
    (a.interruption === null ||
      ['escape', 'blur', 'hidden', 'leave', 'pointer-cancel'].includes(a.interruption)) &&
    Number.isSafeInteger(a.revision) &&
    a.revision >= 0 &&
    (a.deletedAt === null || validTime(a.deletedAt))
  );
}
const conflict = () =>
  new Error('Changed in another tab. Review the refreshed record and try again.');
export function openTimerStore(
  factory: IDBFactory = indexedDB,
  name = 'cubesteps.club.timer',
): Promise<TimerStore> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    let abandoned = false;
    request.onblocked = () => {
      abandoned = true;
      reject(new Error('Storage is blocked by another tab. Close it and retry.'));
    };
    request.onerror = () => reject(request.error ?? new Error('Storage unavailable.'));
    request.onupgradeneeded = () => {
      const table = request.result.createObjectStore('attempts', { keyPath: 'id' });
      table.createIndex('createdAt', 'createdAt');
    };
    request.onsuccess = () => {
      const db = request.result;
      if (abandoned) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      function transaction<T>(
        mode: IDBTransactionMode,
        run: (table: IDBObjectStore, set: (v: T) => void, fail: (e: Error) => void) => void,
      ): Promise<T> {
        return new Promise((resolveTx, rejectTx) => {
          const tx = db.transaction('attempts', mode);
          let value: T;
          let error: Error | null = null;
          tx.oncomplete = () => resolveTx(value);
          tx.onabort = () => rejectTx(error ?? tx.error ?? new Error('Save did not complete.'));
          tx.onerror = () => {
            /* onabort is the final authority */
          };
          try {
            run(
              tx.objectStore('attempts'),
              (v) => {
                value = v;
              },
              (e) => {
                error = e;
                tx.abort();
              },
            );
          } catch (e) {
            error = e instanceof Error ? e : new Error(String(e));
            tx.abort();
          }
        });
      }
      function change<T>(
        id: string,
        edit: (
          a: TimerAttempt,
          set: (v: T) => void,
          fail: (e: Error) => void,
        ) => TimerAttempt | undefined,
      ): Promise<T> {
        return transaction<T>('readwrite', (table, set, fail) => {
          const get = table.get(id);
          get.onsuccess = () => {
            if (!isTimerAttempt(get.result)) {
              fail(new Error('Record is missing or incompatible.'));
              return;
            }
            const next = edit(get.result, set, fail);
            if (next) table.put(next);
          };
        });
      }
      resolve({
        close: () => db.close(),
        list: () =>
          transaction('readonly', (table, set) => {
            const q = table.getAll();
            q.onsuccess = () => {
              const rows: unknown[] = q.result;
              const attempts = rows.filter(isTimerAttempt);
              set({ attempts, invalidCount: rows.length - attempts.length });
            };
          }),
        add: (attempt) => {
          if (!isTimerAttempt(attempt) || attempt.revision !== 0 || attempt.deletedAt !== null)
            return Promise.reject(new Error('Invalid original attempt.'));
          return transaction<void>('readwrite', (table, set, fail) => {
            const q = table.get(attempt.id);
            q.onsuccess = () => {
              if (q.result === undefined) {
                table.add(attempt);
                set(undefined);
              } else if (
                isTimerAttempt(q.result) &&
                Object.keys(attempt).every((k) => q.result[k] === attempt[k as keyof TimerAttempt])
              )
                set(undefined);
              else fail(conflict());
            };
          });
        },
        updatePenalty: (id, revision, penalty) =>
          change(id, (a, set, fail) => {
            if (a.revision !== revision || a.deletedAt !== null) {
              fail(conflict());
              return;
            }
            if (!validPenalty(penalty)) {
              fail(new Error('Invalid penalty.'));
              return;
            }
            const next = { ...a, manualPenalty: penalty, revision: a.revision + 1 };
            set(next);
            return next;
          }),
        softDelete: (id, revision, deletedAt) =>
          change(id, (a, set, fail) => {
            if (a.revision !== revision || a.deletedAt !== null) {
              fail(conflict());
              return;
            }
            if (!validTime(deletedAt)) {
              fail(new Error('Invalid deletion time.'));
              return;
            }
            const next = { ...a, deletedAt, revision: a.revision + 1 };
            set({ id, revision: next.revision });
            return next;
          }),
        undoDelete: (token) =>
          change(token.id, (a, set) => {
            if (a.revision !== token.revision || a.deletedAt === null) {
              set(false);
              return;
            }
            set(true);
            return { ...a, deletedAt: null, revision: a.revision + 1 };
          }),
      });
    };
  });
}
