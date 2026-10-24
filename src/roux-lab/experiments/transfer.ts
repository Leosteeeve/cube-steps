import type { CubeEngine } from '../../core/types';
import type { AdvancedRouxAssets } from '../../methods/roux-advanced/assets';
import { freezeLabValue } from '../../lab/input';
import {
  assertGraph,
  assertRevisionHistory,
  boundedRouxValue,
  date,
  demand,
  emptyRouxNotebook,
  keys,
  sameRouxValue,
} from './schema';
import { verifyRouxExperiment } from './snapshots';
import type { RouxNotebook, RouxRepositorySnapshot, RouxTable, RouxAttempt } from './types';
export const TRANSFER_BYTES = 10 * 1024 * 1024;
export const DATA_TABLES: readonly RouxTable[] = [
  'experiments',
  'comparisons',
  'trialBlocks',
  'testers',
  'attempts',
  'attemptRevisions',
];
export const recordKey = (table: RouxTable, row: { id: string; revision?: number }) =>
  table === 'attemptRevisions' ? `${row.id}:${row.revision}` : row.id;
export function assertTransfer(raw: unknown): asserts raw is RouxNotebook & {
  kind: string;
  schemaVersion: 1;
  method: string;
  exportedAt: string;
} {
  boundedRouxValue(raw);
  keys(raw, ['kind', 'schemaVersion', 'method', 'exportedAt', ...DATA_TABLES]);
  demand(
    raw.kind === 'cubesteps-roux-notebook' &&
      raw.schemaVersion === 1 &&
      raw.method === 'roux-advanced' &&
      date(raw.exportedAt),
    'Unsupported Roux notebook file. CFOP files use CFOP Lab.',
  );
  for (const table of DATA_TABLES) demand(Array.isArray(raw[table]), 'Expected notebook arrays.');
  demand(raw.experiments.length >= 1, 'Select at least one experiment.');
  assertGraph(raw as unknown as RouxNotebook);
  assertRevisionHistory(raw as unknown as RouxNotebook);
}
export async function previewRouxImport(
  engine: CubeEngine,
  text: string,
  assets: AdvancedRouxAssets,
  existing?: RouxNotebook,
): Promise<{ data: RouxNotebook; conflicts: readonly { id: string; reason: string }[] }> {
  demand(
    typeof text === 'string' && new TextEncoder().encode(text).byteLength <= TRANSFER_BYTES,
    'Roux files may be at most 10 MiB.',
  );
  const raw: unknown = JSON.parse(text);
  assertTransfer(raw);
  const data: RouxNotebook = Object.fromEntries(
    DATA_TABLES.map((t) => [t, raw[t]]),
  ) as unknown as RouxNotebook;
  data.experiments = await Promise.all(
    data.experiments.map((e) => verifyRouxExperiment(engine, e, assets)),
  );
  const conflicts: { id: string; reason: string }[] = [];
  if (existing)
    for (const table of DATA_TABLES)
      for (const row of data[table]) {
        const prev = existing[table].find((r) => recordKey(table, r) === recordKey(table, row));
        if (prev && !sameRouxValue(prev, row))
          conflicts.push({
            id: recordKey(table, row),
            reason: `A different ${table} record already uses this ID. Existing data will not be overwritten.`,
          });
      }
  return freezeLabValue({ data, conflicts });
}
export function exportRouxExperiments(
  snapshot: RouxRepositorySnapshot,
  selection: { ids: readonly string[]; includeTrials: boolean; includeLabels: boolean },
): string {
  demand(
    selection.ids.length >= 1 &&
      selection.ids.length <= 50 &&
      new Set(selection.ids).size === selection.ids.length,
    'Select 1–50 distinct experiments.',
  );
  const source = structuredClone(
    Object.fromEntries(DATA_TABLES.map((t) => [t, snapshot[t]])),
  ) as unknown as RouxNotebook;
  for (const pending of snapshot.pending)
    for (const raw of pending.records) {
      const rows = source[pending.table] as { id: string; revision?: number }[],
        row = structuredClone(raw),
        index = rows.findIndex(
          (r) => recordKey(pending.table, r) === recordKey(pending.table, row),
        );
      if (index < 0) rows.push(row);
      else rows[index] = row;
      if (pending.table === 'attempts') {
        const a = row as RouxAttempt;
        source.attemptRevisions = source.attemptRevisions.filter(
          (r) => r.id !== a.id || r.revision < a.revision,
        );
        source.attemptRevisions.push(a);
        if (!source.testers.some((t) => t.id === a.testerId))
          source.testers.push({ id: a.testerId });
      }
    }
  const data = emptyRouxNotebook(),
    ids = new Set(selection.ids);
  data.experiments = source.experiments.filter((e) => ids.has(e.id));
  demand(data.experiments.length === ids.size, 'A selected experiment is unavailable.');
  data.comparisons = source.comparisons.filter((c) => ids.has(c.experimentId));
  if (selection.includeTrials) {
    data.attempts = source.attempts.filter((a) => ids.has(a.experimentId));
    const aids = new Set(data.attempts.map((a) => a.id)),
      cids = new Set(data.comparisons.map((c) => c.id)),
      tids = new Set(data.attempts.map((a) => a.testerId));
    data.attemptRevisions = source.attemptRevisions.filter((a) => aids.has(a.id));
    data.trialBlocks = source.trialBlocks.filter((b) => cids.has(b.comparisonId));
    data.testers = source.testers
      .filter((t) => tids.has(t.id))
      .map((t) => (selection.includeLabels ? t : { id: t.id }));
  }
  const file = {
    kind: 'cubesteps-roux-notebook',
    schemaVersion: 1,
    method: 'roux-advanced',
    exportedAt: new Date().toISOString(),
    ...data,
  };
  assertTransfer(file);
  const output = JSON.stringify(file, null, 2);
  demand(
    new TextEncoder().encode(output).length <= TRANSFER_BYTES,
    'Export exceeds 10 MiB. Select fewer experiments.',
  );
  return output;
}
