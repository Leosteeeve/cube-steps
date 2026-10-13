import { effectiveResult, orderedAttempts } from './statistics';
import type { TimerAttempt } from './types';
function activeUnique(attempts: readonly TimerAttempt[]) {
  const map = new Map<string, TimerAttempt>();
  for (const attempt of attempts) {
    const old = map.get(attempt.id);
    if (!old || attempt.revision >= old.revision) map.set(attempt.id, attempt);
  }
  return orderedAttempts([...map.values()]);
}
export function exportTimerJson(
  attempts: readonly TimerAttempt[],
  exportedAt: string,
  pendingIds: readonly string[] = [],
): string {
  const active = activeUnique(attempts),
    ids = new Set(active.map((a) => a.id));
  return (
    JSON.stringify(
      {
        version: 1,
        exportedAt,
        attempts: active,
        unsavedIds: [...new Set(pendingIds)].filter((id) => ids.has(id)),
      },
      null,
      2,
    ) + '\n'
  );
}
export function exportTimerCsv(
  attempts: readonly TimerAttempt[],
  pendingIds: readonly string[] = [],
): string {
  const headers = [
    'version',
    'id',
    'createdAt',
    'rawMs',
    'scramble',
    'inspectionMs',
    'inspectionPenalty',
    'manualPenalty',
    'interruption',
    'revision',
    'deletedAt',
    'result',
    'effectiveMs',
    'saveStatus',
  ];
  const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = activeUnique(attempts).map((a) => {
    const result = effectiveResult(a);
    return [
      a.version,
      a.id,
      a.createdAt,
      a.rawMs,
      a.scramble,
      a.inspectionMs,
      a.inspectionPenalty,
      a.manualPenalty,
      a.interruption,
      a.revision,
      a.deletedAt,
      result.kind,
      result.kind === 'time' ? result.ms : '',
      pendingIds.includes(a.id) ? 'not-saved' : 'saved',
    ]
      .map(quote)
      .join(',');
  });
  return [headers.map(quote).join(','), ...lines, ''].join('\r\n');
}
export function downloadTimerExport(text: string, format: 'csv' | 'json') {
  const url = URL.createObjectURL(
    new Blob([text], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `cubesteps-timer-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
