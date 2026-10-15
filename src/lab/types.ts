import type { Color, CubeState, PairTrace, SolveInput, TeachingMove } from '../core/types';
import type { TeachingAlgorithm } from '../methods/contracts';

export interface LabHold {
  bottom: Color;
  front: Color;
}
export interface LabSettings {
  allowedColors: readonly Color[];
  modelVersion: 'lab-execution-v1';
}
export interface LabInput {
  input: SolveInput;
  initial: CubeState;
  inputHold: LabHold;
  /** Full, ordered physical state identity. This is not a security signature. */
  fingerprint: string;
}
export type LabSectionId =
  'lab-position' | 'lab-cross' | 'lab-f2l' | 'lab-oll' | 'lab-pll' | 'lab-auf';
export interface LabCheckpoint {
  predicate: 'position' | 'cross-progress' | 'cross' | 'pair' | 'f2l' | 'oll' | 'pll' | 'solved';
  description: string;
  protectedIds: readonly string[];
  targets: readonly string[];
  hold?: LabHold;
}
export interface LabAction {
  id: string;
  section: LabSectionId;
  kind: 'setup' | 'algorithm' | 'rotation';
  ruleId: string;
  caseId: string;
  algorithmId?: string;
  repetition?: { group: string; index: number };
  pair?: PairTrace;
  targets: readonly string[];
  recognition: string;
  explanation: string;
  moves: readonly TeachingMove[];
  before: CubeState;
  after: CubeState;
  checkpoint: LabCheckpoint;
}
export type LabStopReason =
  'complete' | 'time-limit' | 'work-limit' | 'frontier-limit' | 'cancelled' | 'no-route' | 'error';
export interface LabColorCoverage {
  status: 'unvisited' | 'exploring' | 'seeded' | 'exhausted';
  minimum?: number;
  holds: readonly LabHold[];
  lengths: readonly number[];
  crosses: number;
  f2l: number;
}
export interface LabCoverage {
  elapsedMs: number;
  operations: number;
  colors: Partial<Record<Color, LabColorCoverage>>;
  crossCompletions: number;
  f2lCompletions: number;
  rejectedCandidates: number;
  entryHighWater: number;
  reason?: LabStopReason;
}
export interface LabExecutionEvent {
  boundary: number;
  kind: 'turn' | 'rotation' | 'hand-regrip' | 'visibility' | 'awkward';
  profileId: string;
  fromGrip: string;
  toGrip: string;
  count: number;
  rationale: string;
}
export type LabScore =
  | {
      rated: true;
      modelVersion: string;
      T: number;
      R: number;
      G: number;
      V: number;
      A: number;
      cost: number;
      events: readonly LabExecutionEvent[];
    }
  | { rated: false; reason: string };
export interface LabFormula extends TeachingAlgorithm {
  id: string;
  caseId: string;
  sourceRefs: readonly { title: string; url: string; reference: string }[];
}
export interface LabRoute {
  kind: 'cfop-lab';
  schemaVersion: 1;
  id: string;
  inputFingerprint: string;
  input: SolveInput;
  initial: CubeState;
  startHold: LabHold;
  endHold: LabHold;
  positioningMoves: readonly TeachingMove[];
  neutralGrip: string;
  crossMinimum: number;
  crossLength: number;
  actions: readonly LabAction[];
  skips: readonly { section: LabSectionId; reason: string }[];
  boundaries: { crossStart: number; crossEnd: number; f2lEnd: number };
  final: CubeState;
  setupMoves: readonly TeachingMove[];
  score: LabScore;
  searchVersion: string;
  modelVersion: string;
  catalogVersion: string;
  formulas: Readonly<Record<string, LabFormula>>;
}
