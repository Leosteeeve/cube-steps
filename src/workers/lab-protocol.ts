import type { Color, SolveInput } from '../core/types';
import type { LabCoverage, LabRoute, LabSettings, LabStopReason } from '../lab/types';
export interface LabRequest {
  kind: 'analyze';
  requestId: number;
  input: SolveInput;
  settings: LabSettings;
  startedAt: number;
  deadlineAt: number;
}
export type LabReply =
  | { kind: 'initializing'; requestId: number }
  | { kind: 'progress'; requestId: number; coverage: LabCoverage }
  | { kind: 'candidate'; requestId: number; route: LabRoute }
  | { kind: 'done'; requestId: number; reason: LabStopReason; coverage: LabCoverage }
  | { kind: 'error'; requestId: number; code: 'input' | 'assets' | 'search'; message: string };
export interface LabWorkerPort {
  onmessage: ((event: MessageEvent<LabReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(value: LabRequest): void;
  terminate(): void;
}
export const LAB_COLORS: readonly Color[] = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
export const LAB_STOP_REASONS: readonly LabStopReason[] = [
  'complete',
  'time-limit',
  'work-limit',
  'frontier-limit',
  'cancelled',
  'no-route',
  'error',
];
// Reserve independent main-thread verification within the same total ceiling.
export const LAB_WORKER_OPERATIONS = 1_500_000;
export const LAB_CLIENT_OPERATIONS = 500_000;
export const LAB_WORKER_ENTRIES = 24_900;
export const LAB_CLIENT_ENTRIES = 100;
export const LAB_BATCH_MS = 4;
export const LAB_BATCH_OPERATIONS = 128;
export const labNow = () => performance.timeOrigin + performance.now();
export const labYieldTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export function isLabSettings(value: unknown): value is LabSettings {
  const s = value as LabSettings;
  return (
    !!s &&
    s.modelVersion === 'lab-execution-v1' &&
    Array.isArray(s.allowedColors) &&
    s.allowedColors.length > 0 &&
    s.allowedColors.length <= 6 &&
    s.allowedColors.every((c) => LAB_COLORS.includes(c)) &&
    new Set(s.allowedColors).size === s.allowedColors.length
  );
}
const integer = (n: unknown, max: number): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max;
export function emptyLabCoverage(
  settings: LabSettings,
  elapsedMs = 0,
  reason?: LabStopReason,
): LabCoverage {
  return {
    elapsedMs,
    operations: 0,
    colors: Object.fromEntries(
      settings.allowedColors.map((c) => [
        c,
        { status: 'unvisited', holds: [], lengths: [], crosses: 0, f2l: 0 },
      ]),
    ),
    crossCompletions: 0,
    f2lCompletions: 0,
    rejectedCandidates: 0,
    entryHighWater: 0,
    ...(reason ? { reason } : {}),
  };
}
export function isLabCoverage(value: unknown): value is LabCoverage {
  const c = value as LabCoverage;
  if (
    !c ||
    !Number.isFinite(c.elapsedMs) ||
    c.elapsedMs < 0 ||
    c.elapsedMs > 60_000 ||
    !integer(c.operations, 2_000_000) ||
    !integer(c.entryHighWater, 25_000) ||
    !integer(c.crossCompletions, 576) ||
    !integer(c.f2lCompletions, 2_000_000) ||
    !integer(c.rejectedCandidates, 2_000_000) ||
    !c.colors ||
    typeof c.colors !== 'object' ||
    Object.keys(c.colors).length > 6
  )
    return false;
  if (c.reason && !LAB_STOP_REASONS.includes(c.reason)) return false;
  return Object.entries(c.colors).every(
    ([color, row]) =>
      LAB_COLORS.includes(color as Color) &&
      row &&
      ['unvisited', 'exploring', 'seeded', 'exhausted'].includes(row.status) &&
      integer(row.crosses, 96) &&
      integer(row.f2l, 2_000_000) &&
      (row.minimum === undefined || integer(row.minimum, 8)) &&
      Array.isArray(row.holds) &&
      row.holds.length <= 4 &&
      row.holds.every(
        (h) => h.bottom === color && LAB_COLORS.includes(h.front) && h.front !== h.bottom,
      ) &&
      Array.isArray(row.lengths) &&
      row.lengths.length <= 3 &&
      row.lengths.every((n) => integer(n, 10)),
  );
}
export function isLabReply(value: unknown): value is LabReply {
  const r = value as LabReply;
  if (!r || !integer(r.requestId, Number.MAX_SAFE_INTEGER)) return false;
  if (r.kind === 'initializing') return true;
  if (r.kind === 'progress') return isLabCoverage(r.coverage);
  if (r.kind === 'done') return LAB_STOP_REASONS.includes(r.reason) && isLabCoverage(r.coverage);
  if (r.kind === 'error')
    return (
      ['input', 'assets', 'search'].includes(r.code) &&
      typeof r.message === 'string' &&
      r.message.length > 0 &&
      r.message.length <= 2000
    );
  if (r.kind === 'candidate')
    return (
      !!r.route &&
      r.route.kind === 'cfop-lab' &&
      r.route.schemaVersion === 1 &&
      typeof r.route.id === 'string' &&
      r.route.id.length <= 120 &&
      typeof r.route.inputFingerprint === 'string' &&
      r.route.inputFingerprint.length <= 4096 &&
      Array.isArray(r.route.actions) &&
      r.route.actions.length <= 128 &&
      !!r.route.score
    );
  return false;
}
