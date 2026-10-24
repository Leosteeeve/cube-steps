import type { SolveInput } from '../core/types';
import type { AdvancedRouxOutcome, RouxCoverage, RouxRoute, RouxSettings } from '../roux-lab/types';
import type { FirstBlockEvidence, RouxStopReason } from '../methods/roux-advanced/types';
import { ROUX_FRAMES } from '../methods/roux-advanced/frames';
import { assertRouxPlainData } from '../methods/roux-advanced/validate';
export interface RouxAnalyzeRequest {
  kind: 'analyze';
  requestId: number;
  edition: 'club';
  input: SolveInput;
  settings: RouxSettings;
  startedAtEpochMs: number;
}
export type RouxRequest = RouxAnalyzeRequest | { kind: 'cancel'; requestId: number };
export type RouxReply =
  | { requestId: number; kind: 'progress'; coverage: RouxCoverage }
  | { requestId: number; kind: 'candidate'; route: RouxRoute }
  | { requestId: number; kind: 'done'; outcome: AdvancedRouxOutcome }
  | { requestId: number; kind: 'error'; message: string };
export interface RouxWorkerPort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(value: RouxRequest): void;
  terminate(): void;
}
export const ROUX_BATCH_MS = 8,
  ROUX_BATCH_OPERATIONS = 256;
export const ROUX_WORKER_OPERATIONS = { normal: 400000, lab: 1500000 } as const;
export const ROUX_CLIENT_OPERATIONS = { normal: 100000, lab: 500000 } as const;
export const rouxNow = () => performance.timeOrigin + performance.now();
export const rouxYieldTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export const rouxDuration = (s: RouxSettings) => (s.mode === 'normal' ? 8000 : 30000);
export const ROUX_STOP_REASONS: readonly RouxStopReason[] = [
  'complete',
  'time-limit',
  'work-limit',
  'frontier-limit',
  'memory-limit',
  'cancelled',
  'error',
];
const integer = (n: unknown, max = Number.MAX_SAFE_INTEGER): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max;
export function isRouxSettings(value: unknown): value is RouxSettings {
  const s = value as RouxSettings;
  return (
    !!s &&
    s.modelVersion === 'roux-execution-v1' &&
    ['normal', 'lab'].includes(s.mode) &&
    Array.isArray(s.allowedFrames) &&
    s.allowedFrames.length > 0 &&
    s.allowedFrames.length <= 8 &&
    new Set(s.allowedFrames).size === s.allowedFrames.length &&
    s.allowedFrames.every((id) => ROUX_FRAMES.some((f) => f.id === id))
  );
}
export function isRouxInputShape(value: unknown): value is SolveInput {
  const input = value as SolveInput;
  if (!input) return false;
  if (input.kind === 'scramble')
    return (
      Array.isArray(input.moves) &&
      input.moves.length <= 1000 &&
      input.moves.every((m) => typeof m === 'string' && /^[UDLRFB][2']?$/.test(m))
    );
  return (
    input.kind === 'facelets' &&
    !!input.facelets &&
    (['U', 'R', 'F', 'D', 'L', 'B'] as const).every(
      (f) =>
        Array.isArray(input.facelets[f]) &&
        input.facelets[f].length === 9 &&
        input.facelets[f].every((c) =>
          ['white', 'yellow', 'green', 'blue', 'red', 'orange'].includes(c),
        ),
    )
  );
}
export function isRouxRequest(value: unknown): value is RouxRequest {
  try {
    assertRouxPlainData(value);
    const r = value as RouxRequest;
    if (!r || !integer(r.requestId)) return false;
    return (
      r.kind === 'cancel' ||
      (r.kind === 'analyze' &&
        r.edition === 'club' &&
        isRouxInputShape(r.input) &&
        isRouxSettings(r.settings) &&
        Number.isFinite(r.startedAtEpochMs) &&
        r.startedAtEpochMs >= 0)
    );
  } catch {
    return false;
  }
}
export function emptyRouxCoverage(
  settings: RouxSettings,
  elapsedMs = 0,
  reason?: RouxStopReason,
): RouxCoverage {
  return {
    elapsedMs,
    operations: 0,
    entries: 0,
    retainedBytes: 0,
    verifiedRoutes: 0,
    frames: Object.fromEntries(settings.allowedFrames.map((f) => [f, { status: 'not-explored' }])),
    ...(reason ? { reason } : {}),
  };
}
function evidenceShape(e: FirstBlockEvidence): boolean {
  if (!e) return false;
  if (e.status === 'not-explored') return true;
  if (
    !['best-found', 'proven-minimum'].includes(e.status) ||
    !Array.isArray(e.witness) ||
    e.witness.length > 128 ||
    e.witness.some((m) => typeof m !== 'string' || m.length > 3)
  )
    return false;
  return e.status === 'best-found'
    ? integer(e.lowerBound, 128) &&
        integer(e.upperBound, 128) &&
        e.lowerBound <= e.upperBound &&
        e.upperBound === e.witness.length &&
        Number.isInteger(e.completedDepth) &&
        e.completedDepth >= -1 &&
        e.completedDepth <= 128
    : integer(e.minimum, 128) &&
        e.minimum === e.witness.length &&
        !!e.proof &&
        e.proof.coordinateVersion === 1 &&
        e.proof.moveSetVersion === 'roux-stm-v1' &&
        typeof e.proof.assetDigest === 'string' &&
        e.proof.assetDigest.length === 64 &&
        Number.isInteger(e.proof.completedDepth) &&
        e.proof.completedDepth >= -1 &&
        e.proof.completedDepth <= 128;
}
export function isRouxCoverage(value: unknown): value is RouxCoverage {
  const c = value as RouxCoverage;
  return (
    !!c &&
    Number.isFinite(c.elapsedMs) &&
    c.elapsedMs >= 0 &&
    integer(c.operations, 2000000) &&
    integer(c.entries, 25000) &&
    integer(c.retainedBytes, 128 * 1024 * 1024) &&
    integer(c.verifiedRoutes, 2000000) &&
    (!c.reason || ROUX_STOP_REASONS.includes(c.reason)) &&
    !!c.frames &&
    Object.keys(c.frames).length <= 8 &&
    Object.entries(c.frames).every(
      ([id, e]) => ROUX_FRAMES.some((f) => f.id === id) && evidenceShape(e),
    )
  );
}
function routeShape(value: unknown): value is RouxRoute {
  const r = value as RouxRoute;
  return (
    !!r &&
    r.kind === 'roux-lab' &&
    r.schemaVersion === 1 &&
    typeof r.id === 'string' &&
    r.id.length <= 120 &&
    !!r.input &&
    isRouxInputShape(r.input.source) &&
    typeof r.input.fingerprint === 'string' &&
    r.input.fingerprint.length <= 4096 &&
    ROUX_FRAMES.some((f) => f.id === r.frameId) &&
    !!r.trace &&
    r.trace.method === 'roux-advanced' &&
    r.trace.stages?.length === 6 &&
    r.trace.stages.every((s) => Array.isArray(s.actions) && s.actions.length <= 128) &&
    r.trace.stages.reduce((count, s) => count + s.actions.length, 0) <= 128 &&
    !!r.score &&
    evidenceShape(r.evidence)
  );
}
export function isRouxReply(value: unknown): value is RouxReply {
  try {
    assertRouxPlainData(value);
    const r = value as RouxReply;
    if (!r || !integer(r.requestId)) return false;
    if (r.kind === 'error')
      return typeof r.message === 'string' && r.message.length > 0 && r.message.length <= 2000;
    if (r.kind === 'progress') return isRouxCoverage(r.coverage);
    if (r.kind === 'candidate') return routeShape(r.route);
    if (r.kind !== 'done' || !r.outcome || !isRouxCoverage(r.outcome.coverage)) return false;
    return r.outcome.ok === true
      ? Array.isArray(r.outcome.routes) &&
          r.outcome.routes.length > 0 &&
          r.outcome.routes.length <= 4 &&
          r.outcome.routes.every(routeShape)
      : r.outcome.ok === false &&
          ['budget', 'initialization', 'verification', 'unsupported-case'].includes(
            r.outcome.code,
          ) &&
          typeof r.outcome.message === 'string' &&
          r.outcome.message.length > 0 &&
          r.outcome.message.length <= 2000;
  } catch {
    return false;
  }
}
