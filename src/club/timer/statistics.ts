import type { TimerAttempt, TimerResult } from './types';
export function orderedAttempts(attempts: readonly TimerAttempt[]): TimerAttempt[] {
  return attempts
    .filter((a) => a.deletedAt === null)
    .slice()
    .sort((a, b) =>
      a.createdAt < b.createdAt
        ? -1
        : a.createdAt > b.createdAt
          ? 1
          : a.id < b.id
            ? -1
            : a.id > b.id
              ? 1
              : 0,
    );
}
export function effectiveResult(attempt: TimerAttempt): TimerResult {
  if (attempt.deletedAt !== null) return { kind: 'insufficient' };
  if (
    attempt.interruption ||
    attempt.inspectionPenalty === 'dnf' ||
    attempt.manualPenalty === 'dnf'
  )
    return { kind: 'dnf' };
  return {
    kind: 'time',
    ms:
      attempt.rawMs +
      (attempt.inspectionPenalty === 'plus2' ? 2000 : 0) +
      (attempt.manualPenalty === 'plus2' ? 2000 : 0),
  };
}
export function averageOf(attempts: readonly TimerAttempt[], count: 5 | 12): TimerResult {
  const active = orderedAttempts(attempts).slice(-count);
  if (active.length < count) return { kind: 'insufficient' };
  const results = active.map(effectiveResult);
  if (results.filter((r) => r.kind === 'dnf').length > 1) return { kind: 'dnf' };
  const numbers = results
    .map((r) => (r.kind === 'time' ? r.ms : Infinity))
    .sort((a, b) => a - b)
    .slice(1, -1);
  return { kind: 'time', ms: numbers.reduce((sum, ms) => sum + ms, 0) / numbers.length };
}
export function summarizeHistory(attempts: readonly TimerAttempt[]) {
  const active = orderedAttempts(attempts),
    times = active.map(effectiveResult).filter((r) => r.kind === 'time');
  const best: TimerResult = times.length
    ? { kind: 'time', ms: times.reduce((best, r) => Math.min(best, r.ms), Infinity) }
    : active.length
      ? { kind: 'dnf' }
      : { kind: 'insufficient' };
  return { count: active.length, best, ao5: averageOf(active, 5), ao12: averageOf(active, 12) };
}
export function buildTrend(attempts: readonly TimerAttempt[]) {
  const active = orderedAttempts(attempts),
    start = Math.max(0, active.length - 50);
  return active.slice(start).map((a, i) => {
    const index = start + i;
    return {
      id: a.id,
      index: index + 1,
      single: effectiveResult(a),
      ao5: averageOf(active.slice(Math.max(0, index - 4), index + 1), 5),
      ao12: averageOf(active.slice(Math.max(0, index - 11), index + 1), 12),
    };
  });
}
