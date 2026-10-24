import type { RouxInput } from '../../methods/roux-advanced/types';
import type { RouxRoute, RouxSettings, RouxCoverage } from '../types';
import type { TeachingMove } from '../../core/types';
import type {
  LabAttempt,
  LabComparison,
  LabTester,
  TrialBlock,
  TimingMethod,
  TrialInterruption,
} from '../../lab/experiments/types';
export type { TimingMethod, TrialInterruption };
export interface RouxExperiment {
  schemaVersion: 1;
  method: 'roux-advanced';
  id: string;
  createdAt: string;
  label?: string;
  input: RouxInput;
  setupMoves: readonly TeachingMove[];
  settings: RouxSettings;
  coverage: RouxCoverage;
  routes: readonly RouxRoute[];
  versions: RouxRoute['versions'];
}
export type RouxComparison = LabComparison;
export type RouxTrialBlock = TrialBlock;
export type RouxTester = LabTester;
export interface RouxAttempt extends Omit<LabAttempt, 'endpoint'> {
  endpoint: 'roux-blocks';
  method: 'roux-advanced';
}
export interface RouxNotebook {
  experiments: RouxExperiment[];
  comparisons: RouxComparison[];
  trialBlocks: RouxTrialBlock[];
  testers: RouxTester[];
  attempts: RouxAttempt[];
  attemptRevisions: RouxAttempt[];
}
export type RouxTable = keyof RouxNotebook;
export interface RouxStoredData extends RouxNotebook {
  incompatibleCount: number;
  incompatibleRecords: { table: RouxTable; value: unknown }[];
}
export interface RouxPending {
  id: string;
  table: RouxTable;
  records: readonly (RouxExperiment | RouxComparison | RouxTrialBlock | RouxTester | RouxAttempt)[];
  error?: string;
  conflict?: boolean;
}
export interface RouxRepositorySnapshot extends RouxStoredData {
  pending: readonly RouxPending[];
  error: string;
  conflicts: readonly string[];
}
export interface RouxDeleteToken {
  id: string;
  revision: number;
}
