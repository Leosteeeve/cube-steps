import { freezeLabValue } from '../input';
import type { LabContext } from '../finalize';
import { verifyExperiment } from './snapshots';
import {
  assertGraph,
  assertRevisionHistory,
  boundedLabValue,
  date,
  demand,
  emptyLabData,
  id,
  integer,
  keys,
  sameLabValue,
} from './schema';
import type { LabAttempt, LabData, LabRepositorySnapshot, LabTable } from './types';
export { assertRevisionHistory } from './schema';
export const TRANSFER_BYTES = 10 * 1024 * 1024;
export const DATA_TABLES: readonly LabTable[] = [
  'experiments',
  'comparisons',
  'trialBlocks',
  'testers',
  'attempts',
  'attemptRevisions',
];
export interface LabPendingReference {
  table: LabTable;
  id: string;
  revision?: number;
}
export interface LabTransferFile extends LabData {
  schemaVersion: 1;
  exportedAt: string;
  pending: LabPendingReference[];
}
export interface LabImportPreview {
  readonly data: LabTransferFile;
  readonly deduplicated: number;
  readonly conflicts: readonly { experimentId: string; reason: string }[];
  readonly archives: readonly string[];
}
export type ImportResolutions = Readonly<Record<string, 'skip' | 'import-copy'>>;
const staged = new WeakSet<LabImportPreview>();
export const recordKey = (table: LabTable, row: { id: string; revision?: number }) =>
  table === 'attemptRevisions' ? `${row.id}:${row.revision}` : row.id;
export function assertTransfer(raw: unknown): asserts raw is LabTransferFile {
  boundedLabValue(raw);
  keys(raw, ['schemaVersion', 'exportedAt', 'pending', ...DATA_TABLES]);
  demand(raw.schemaVersion === 1 && date(raw.exportedAt), 'Unsupported transfer schema.');
  for (const table of DATA_TABLES) demand(Array.isArray(raw[table]), 'Expected record arrays.');
  demand(raw.experiments.length >= 1 && raw.experiments.length <= 50, 'Select 1–50 experiments.');
  demand(
    raw.attempts.length + raw.attemptRevisions.length <= 5000,
    'Select fewer trials: at most 5,000 attempt and revision records.',
  );
  demand(
    raw.comparisons.length <= 300 && raw.trialBlocks.length <= 2500 && raw.testers.length <= 2500,
    'Too many related records.',
  );
  assertGraph(raw as LabTransferFile);
  assertRevisionHistory(raw as LabTransferFile);
  demand(Array.isArray(raw.pending) && raw.pending.length <= 5000, 'Invalid pending markers.');
  const markerKeys = new Set<string>();
  for (const p of raw.pending) {
    keys(p, ['table', 'id'], ['revision']);
    demand(
      DATA_TABLES.includes(p.table) &&
        id(p.id) &&
        (p.revision === undefined || integer(p.revision)),
      'Invalid pending marker.',
    );
    const marker = `${p.table}:${p.id}:${p.revision ?? ''}`;
    demand(!markerKeys.has(marker), 'Duplicate pending marker.');
    markerKeys.add(marker);
    demand(
      raw[p.table].some(
        (r: any) => r.id === p.id && (p.revision === undefined || r.revision === p.revision),
      ),
      'Dangling pending marker.',
    );
  }
  demand(
    new TextEncoder().encode(JSON.stringify(raw)).byteLength <= TRANSFER_BYTES,
    'File exceeds 10 MiB; select fewer experiments or trials.',
  );
}
export function subsetLabData(data: LabData, experimentIds: ReadonlySet<string>): LabData {
  const result = emptyLabData();
  result.experiments = data.experiments.filter((e) => experimentIds.has(e.id));
  result.comparisons = data.comparisons.filter((c) => experimentIds.has(c.experimentId));
  const comparisons = new Set(result.comparisons.map((c) => c.id));
  result.trialBlocks = data.trialBlocks.filter((b) => comparisons.has(b.comparisonId));
  result.attempts = data.attempts.filter((a) => experimentIds.has(a.experimentId));
  const attempts = new Set(result.attempts.map((a) => a.id));
  result.attemptRevisions = data.attemptRevisions.filter((a) => attempts.has(a.id));
  const testers = new Set(result.attempts.map((a) => a.testerId));
  result.testers = data.testers.filter((t) => testers.has(t.id));
  return structuredClone(result);
}
/** Snapshot IDs are copied; content-addressed route IDs remain exact physical identities. */
export function copyLabData(data: LabData): LabData {
  const copy = structuredClone(data),
    map = new Map<string, string>();
  const remap = (kind: string, v: string) => {
    const k = `${kind}:${v}`;
    if (!map.has(k)) map.set(k, crypto.randomUUID());
    return map.get(k)!;
  };
  for (const e of copy.experiments) {
    e.provenance = e.id;
    e.id = remap('experiment', e.id);
  }
  for (const c of copy.comparisons) {
    c.id = remap('comparison', c.id);
    c.experimentId = remap('experiment', c.experimentId);
  }
  for (const b of copy.trialBlocks) {
    b.id = remap('block', b.id);
    b.comparisonId = remap('comparison', b.comparisonId);
    for (const s of b.slots) s.id = remap('slot', s.id);
  }
  for (const t of copy.testers) t.id = remap('tester', t.id);
  for (const a of [...copy.attempts, ...copy.attemptRevisions]) {
    a.id = remap('attempt', a.id);
    a.experimentId = remap('experiment', a.experimentId);
    a.testerId = remap('tester', a.testerId);
    if (a.comparisonId) a.comparisonId = remap('comparison', a.comparisonId);
    if (a.blockId) a.blockId = remap('block', a.blockId);
    if (a.slot) a.slot = remap('slot', a.slot);
    if (a.retryOf) a.retryOf = remap('attempt', a.retryOf);
  }
  return copy;
}
export async function stageLabImport(
  file: File,
  context: LabContext,
  existing: LabRepositorySnapshot,
): Promise<LabImportPreview> {
  demand(file.size <= TRANSFER_BYTES, 'File exceeds 10 MiB; select a smaller export.');
  const raw: unknown = JSON.parse(await file.text());
  assertTransfer(raw);
  const archives: string[] = [];
  for (const e of raw.experiments) {
    const routes = await verifyExperiment(context, e);
    if (routes.some((r) => r.validationMode === 'archive')) archives.push(e.id);
  }
  let deduplicated = 0;
  const conflicts: LabImportPreview['conflicts'][number][] = [];
  const conflictKeys = new Set<string>();
  for (const table of DATA_TABLES)
    for (const row of raw[table]) {
      const key = recordKey(table, row),
        stored = existing[table].find((r) => recordKey(table, r) === key);
      const unknown = existing.incompatibleRecords.some(
        (r) =>
          r.table === table && ((r.value as any)?.id === row.id || (r.value as any)?.key === key),
      );
      if (stored && sameLabValue(stored, row)) deduplicated++;
      else if (stored || unknown) conflictKeys.add(`${table}:${key}`);
    }
  for (const e of raw.experiments) {
    const group = subsetLabData(raw, new Set([e.id]));
    const collision =
      DATA_TABLES.some((t) => group[t].some((r) => conflictKeys.has(`${t}:${recordKey(t, r)}`))) ||
      group.trialBlocks.some((b) =>
        existing.trialBlocks.some(
          (old) =>
            old.comparisonId === b.comparisonId && old.ordinal === b.ordinal && old.id !== b.id,
        ),
      );
    if (collision)
      conflicts.push({
        experimentId: e.id,
        reason:
          'An identity already has different stored content. Keep the stored records; skip this experiment or import a separate copy.',
      });
  }
  const result = freezeLabValue({ data: structuredClone(raw), deduplicated, conflicts, archives });
  staged.add(result);
  return result;
}
export function resolveLabImport(
  preview: LabImportPreview,
  resolutions: ImportResolutions,
): LabData {
  demand(staged.has(preview), 'Use a validated, staged import preview.');
  const result = emptyLabData();
  for (const e of preview.data.experiments) {
    const choice = resolutions[e.id];
    if (preview.conflicts.some((c) => c.experimentId === e.id))
      demand(
        choice === 'skip' || choice === 'import-copy',
        'Choose skip or import a copy for every conflict.',
      );
    if (choice === 'skip') continue;
    let group = subsetLabData(preview.data, new Set([e.id]));
    if (choice === 'import-copy') group = copyLabData(group);
    for (const t of DATA_TABLES)
      for (const row of group[t]) {
        const old = result[t].find((r) => recordKey(t, r) === recordKey(t, row));
        demand(!old || sameLabValue(old, row), 'Imported graphs disagree.');
        if (!old) (result[t] as any[]).push(row);
      }
  }
  assertGraph(result);
  assertRevisionHistory(result);
  return result;
}
export async function commitLabImport(
  preview: LabImportPreview,
  resolutions: ImportResolutions,
  repository: { commitImport(data: LabData): Promise<void> },
) {
  const data = resolveLabImport(preview, resolutions);
  if (data.experiments.length) await repository.commitImport(data);
}
