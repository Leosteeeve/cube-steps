import type { SolveInput, TeachingMove } from '../../core/types';
import type { LabCoverage, LabHold, LabRoute, LabSettings } from '../types';
export interface LabExperiment {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  label?: string;
  input: SolveInput;
  inputFingerprint: string;
  setupMoves: readonly TeachingMove[];
  diagramHold: LabHold;
  settings: LabSettings;
  limits: {
    deadlineMs: number;
    operations: number;
    entries: number;
    crossPerColor: number;
    beam: number;
    shortlist: number;
  };
  coverage: LabCoverage;
  appVersion: string;
  modelVersion: string;
  catalogVersion: string;
  searchVersion: string;
  routes: readonly LabRoute[];
  provenance?: string;
}
export interface LabComparison {
  schemaVersion: 1;
  id: string;
  experimentId: string;
  routeAId: string;
  routeBId: string;
  createdAt: string;
}
export interface TrialBlock {
  id: string;
  ordinal: number;
  comparisonId: string;
  createdAt: string;
  intendedOrder: 'AB' | 'BA';
  slots: readonly [
    { id: string; label: 'A'; routeId: string },
    { id: string; label: 'B'; routeId: string },
  ];
}
export interface LabTester {
  id: string;
  label?: string;
}
export type TimingMethod = 'keyboard' | 'touch' | 'external-manual';
export type TrialInterruption = 'blur' | 'hidden' | 'escape' | 'leave' | 'pointer-cancel' | 'help';
export interface LabAttempt {
  schemaVersion: 1;
  id: string;
  revision: number;
  previousRevision: number | null;
  createdAt: string;
  updatedAt: string;
  experimentId: string;
  routeId: string;
  comparisonId?: string;
  blockId?: string;
  slot?: string;
  retryOf?: string;
  testerId: string;
  timingMethod: TimingMethod;
  endpoint: 'cross-f2l';
  kind: 'warmup' | 'measured';
  outcome: 'followed' | 'deviated' | 'incomplete' | 'interrupted';
  rawMs: number | null;
  setupConfirmed: boolean;
  holdConfirmed: boolean;
  intendedOrder?: 'AB' | 'BA';
  actualOrder?: number;
  interruption: TrialInterruption | null;
  flow?: number;
  recognition?: number;
  note?: string;
  deletedAt: string | null;
}
export interface LabData {
  experiments: LabExperiment[];
  comparisons: LabComparison[];
  trialBlocks: TrialBlock[];
  testers: LabTester[];
  attempts: LabAttempt[];
  attemptRevisions: LabAttempt[];
}
export type LabTable = keyof LabData;
export interface LabStoredData extends LabData {
  incompatibleCount: number;
  incompatibleRecords: { table: LabTable; value: unknown }[];
}
export interface LabPending {
  id: string;
  table: LabTable;
  records: readonly (LabExperiment | LabComparison | TrialBlock | LabTester | LabAttempt)[];
  error?: string;
  conflict?: boolean;
}
export interface LabRepositorySnapshot extends LabStoredData {
  pending: readonly LabPending[];
  error: string;
  conflicts: readonly string[];
}
export interface LabDeleteToken {
  id: string;
  revision: number;
}
