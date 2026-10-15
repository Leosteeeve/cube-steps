import { assertGraph, demand, emptyLabData } from './schema';
import type { LabAttempt, LabData, LabRepositorySnapshot } from './types';
import {
  DATA_TABLES,
  assertTransfer,
  recordKey,
  type LabTransferFile,
  type LabPendingReference,
} from './transfer';
import { selectEligibleAttempts } from '../trials/blocks';
export interface LabExportSelection {
  experimentIds: readonly string[];
  comparisonIds?: readonly string[];
  includeAttempts?: boolean;
  includeTesterLabels?: boolean;
}
export function buildLabExport(
  snapshot: LabRepositorySnapshot,
  selection: LabExportSelection,
): LabTransferFile {
  demand(
    selection.experimentIds.length >= 1 && selection.experimentIds.length <= 50,
    'Select 1–50 experiments.',
  );
  const source = Object.fromEntries(
    DATA_TABLES.map((t) => [t, structuredClone(snapshot[t])]),
  ) as unknown as LabData;
  const pending: LabPendingReference[] = [];
  for (const operation of snapshot.pending)
    for (const row of operation.records) {
      const table = operation.table,
        rows = source[table] as any[];
      const index = rows.findIndex((r) => recordKey(table, r) === recordKey(table, row));
      if (index >= 0) rows[index] = structuredClone(row);
      else rows.push(structuredClone(row));
      pending.push({ table, id: row.id, ...('revision' in row ? { revision: row.revision } : {}) });
      if (table === 'attempts') {
        const a = row as LabAttempt;
        source.attemptRevisions = source.attemptRevisions.filter(
          (r) => r.id !== a.id || r.revision < a.revision,
        );
        source.attemptRevisions.push(structuredClone(a));
        if (!source.testers.some((t) => t.id === a.testerId))
          source.testers.push({ id: a.testerId });
      }
    }
  const data = emptyLabData(),
    ids = new Set(selection.experimentIds);
  data.experiments = source.experiments.filter((e) => ids.has(e.id));
  demand(data.experiments.length === ids.size, 'A selected experiment is unavailable.');
  if (selection.includeAttempts) {
    const selectedComparisons = selection.comparisonIds && new Set(selection.comparisonIds);
    data.attempts = source.attempts.filter(
      (a) =>
        ids.has(a.experimentId) &&
        (!selectedComparisons || !a.comparisonId || selectedComparisons.has(a.comparisonId)),
    );
    const attemptIds = new Set(data.attempts.map((a) => a.id));
    data.attemptRevisions = source.attemptRevisions.filter((a) => attemptIds.has(a.id));
    const comparisonIds = new Set(
      data.attempts.flatMap((a) => (a.comparisonId ? [a.comparisonId] : [])),
    );
    data.comparisons = source.comparisons.filter(
      (c) => ids.has(c.experimentId) && (comparisonIds.has(c.id) || selectedComparisons?.has(c.id)),
    );
    const blockIds = new Set(data.attempts.flatMap((a) => (a.blockId ? [a.blockId] : [])));
    data.trialBlocks = source.trialBlocks.filter((b) => blockIds.has(b.id));
    const testers = new Set(data.attempts.map((a) => a.testerId));
    data.testers = source.testers
      .filter((t) => testers.has(t.id))
      .map((t) => (selection.includeTesterLabels ? t : { id: t.id }));
  } else if (selection.comparisonIds)
    data.comparisons = source.comparisons.filter(
      (c) => ids.has(c.experimentId) && selection.comparisonIds!.includes(c.id),
    );
  const file: LabTransferFile = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    ...data,
    pending: pending.filter((p) =>
      data[p.table].some((r) => r.id === p.id && (!('revision' in r) || r.revision === p.revision)),
    ),
  };
  assertTransfer(file);
  return file;
}
function cell(v: unknown): string {
  if (typeof v === 'number') {
    demand(Number.isFinite(v), 'Invalid numeric CSV value.');
    return String(v);
  }
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[\s\x00-\x1f\x7f-\x9f]*[=+\-@]/u.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function exportLabCsv(
  snapshot: LabRepositorySnapshot,
  selection: LabExportSelection,
): string {
  const p = buildLabExport(snapshot, selection);
  assertGraph(p);
  const header = [
    'record',
    'experiment_id',
    'experiment_label',
    'route_id',
    'bottom',
    'front',
    'model_version',
    'catalog_version',
    'search_version',
    'attempt_id',
    'revision',
    'previous_revision',
    'tester_id',
    'tester_label',
    'timing_method',
    'endpoint',
    'kind',
    'outcome',
    'raw_ms',
    'comparison_id',
    'block_id',
    'slot',
    'intended_order',
    'actual_order',
    'retry_of',
    'eligible',
    'exclusion',
    'flow',
    'recognition',
    'note',
    'pending',
    'deleted',
    'created_at',
    'updated_at',
    'setup_confirmed',
    'hold_confirmed',
    'interruption',
    'app_version',
    'deleted_at',
  ];
  const rows: unknown[][] = [];
  for (const a of p.attemptRevisions) {
    const e = p.experiments.find((e) => e.id === a.experimentId)!,
      r = e.routes.find((r) => r.id === a.routeId)!;
    const selected = selectEligibleAttempts(
      p.attempts.filter(
        (x) =>
          x.experimentId === a.experimentId &&
          x.comparisonId === a.comparisonId &&
          x.testerId === a.testerId &&
          x.timingMethod === a.timingMethod,
      ),
      p.trialBlocks.filter((b) => b.comparisonId === a.comparisonId),
    );
    const head = p.attempts.find((x) => x.id === a.id)!,
      current = head.revision === a.revision;
    rows.push([
      current ? 'head' : 'prior revision',
      e.id,
      e.label,
      r.id,
      r.startHold.bottom,
      r.startHold.front,
      e.modelVersion,
      e.catalogVersion,
      e.searchVersion,
      a.id,
      a.revision,
      a.previousRevision,
      a.testerId,
      p.testers.find((t) => t.id === a.testerId)?.label,
      a.timingMethod,
      a.endpoint,
      a.kind,
      a.outcome,
      a.rawMs,
      a.comparisonId,
      a.blockId,
      a.slot,
      a.intendedOrder,
      a.actualOrder,
      a.retryOf,
      current && selected.slots.some((s) => s.attempt?.id === a.id),
      current ? selected.excluded.find((x) => x.attemptId === a.id)?.reason : 'Superseded revision',
      a.flow,
      a.recognition,
      a.note,
      p.pending.some((x) => x.id === a.id && x.revision === a.revision),
      !!a.deletedAt,
      a.createdAt,
      a.updatedAt,
      a.setupConfirmed,
      a.holdConfirmed,
      a.interruption,
      e.appVersion,
      a.deletedAt,
    ]);
  }
  if (!selection.includeAttempts)
    for (const e of p.experiments)
      for (const r of e.routes)
        rows.push([
          'route',
          e.id,
          e.label,
          r.id,
          r.startHold.bottom,
          r.startHold.front,
          e.modelVersion,
          e.catalogVersion,
          e.searchVersion,
          ...Array(header.length - 9).fill(''),
        ]);
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
