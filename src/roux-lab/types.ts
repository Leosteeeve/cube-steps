import type { SolveTrace } from '../core/types';
import type { TeachingAlgorithm } from '../methods/contracts';
import type {
  FirstBlockEvidence,
  RouxFrameId,
  RouxInput,
  RouxSearchMode,
  RouxStopReason,
} from '../methods/roux-advanced/types';
import type { CmllVariant } from '../methods/roux-advanced/cmll/types';
import type { RouxExecutionScore } from '../methods/roux-advanced/execution/types';
export interface RouxSettings {
  allowedFrames: readonly RouxFrameId[];
  mode: RouxSearchMode;
  modelVersion: 'roux-execution-v1';
}
export interface RouxCoverage {
  elapsedMs: number;
  operations: number;
  entries: number;
  retainedBytes: number;
  frames: Partial<Record<RouxFrameId, FirstBlockEvidence>>;
  verifiedRoutes: number;
  reason?: RouxStopReason;
}
export interface RouxRoute {
  kind: 'roux-lab';
  schemaVersion: 1;
  id: string;
  input: RouxInput;
  frameId: RouxFrameId;
  trace: SolveTrace;
  basis: 'optimized' | 'baseline-fallback';
  evidence: FirstBlockEvidence;
  score: RouxExecutionScore;
  counts: { first: number; second: number; combined: number; rotations: number };
  boundaries: { firstStart: number; firstEnd: number; secondEnd: number; cmllEnd: number };
  lseMode: 'combined' | 'basic';
  formulas: Readonly<Record<string, CmllVariant | TeachingAlgorithm>>;
  versions: { app: string; search: string; catalog: string; model: string };
}
export type AdvancedRouxOutcome =
  | { ok: true; routes: readonly RouxRoute[]; coverage: RouxCoverage }
  | {
      ok: false;
      code: 'budget' | 'initialization' | 'verification' | 'unsupported-case';
      message: string;
      coverage: RouxCoverage;
    };
