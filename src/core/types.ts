export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type FaceMove = `${Face}${'' | "'" | '2'}`;
export type TeachingMove =
  FaceMove | `${`${Face}w` | 'x' | 'y' | 'z' | 'M' | 'E' | 'S'}${'' | "'" | '2'}`;
import type { RouxActionMetadata, RouxStageId } from '../methods/roux/types';
import type {
  AdvancedRouxActionMetadata,
  AdvancedRouxStageId,
} from '../methods/roux-advanced/types';
export type { RouxStageId } from '../methods/roux/types';
export type MethodId =
  'lbl' | 'cfop-beginner' | 'cfop-advanced' | 'roux-beginner' | 'roux-advanced';
export type Color = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';
export type Facelets = Readonly<Record<Face, readonly (Color | null)[]>>;
export type FaceletSnapshot = Readonly<Record<Face, readonly Color[]>>;
export type FaceletRef = { face: Face; index: number };
export interface CubeState {
  data: Record<string, { pieces: number[]; orientation: number[]; orientationMod?: number[] }>;
}
export interface PieceObservation {
  id: string;
  slot: string;
  stickers: Partial<Record<Face, Color>>;
}
export interface CubeObservation {
  centers: Record<Face, Color>;
  edges: PieceObservation[];
  corners: PieceObservation[];
}
export interface CubeEngine {
  solved(): CubeState;
  apply(state: CubeState, moves: readonly TeachingMove[]): CubeState;
  observe(state: CubeState): CubeObservation;
  isSolved(state: CubeState): boolean;
  equals(a: CubeState, b: CubeState): boolean;
}
export type LBLStageId =
  | 'white-cross'
  | 'first-layer'
  | 'middle-layer'
  | 'top-cross'
  | 'top-edges'
  | 'top-corners'
  | 'corner-orientation';
export type CFOPStageId =
  | 'cfop-cross'
  | 'cfop-f2l'
  | 'cfop-oll-edges'
  | 'cfop-oll-corners'
  | 'cfop-pll-corners'
  | 'cfop-pll-edges'
  | 'cfop-auf';
export type AdvancedStageId =
  'advanced-cross' | 'advanced-f2l' | 'advanced-oll' | 'advanced-pll' | 'advanced-auf';
export type StageId =
  LBLStageId | CFOPStageId | AdvancedStageId | RouxStageId | AdvancedRouxStageId;
export interface PairTrace {
  cornerId: string;
  edgeId: string;
  slot: string;
  phase: 'prepare' | 'pair' | 'insert';
  ordinal: number;
  solvedBefore: number;
  solvedAfter: number;
}
export interface Checkpoint {
  id: string;
  description: string;
  passed: boolean;
}
export interface ExecutionMetrics {
  quality: number;
  faceTurns: number;
  rotations: number;
  effort: number;
  reasons: string[];
}
export interface TraceAction {
  roux?: RouxActionMetadata;
  rouxAdvanced?: AdvancedRouxActionMetadata;
  kind: 'setup' | 'algorithm' | 'regrip' | 'joined';
  /** Verified reference actions; execute moves, not these uncombined references. */
  joined?: { sources: TraceAction[]; savedMoves: number };
  ruleId: string;
  caseId: string;
  targets: string[];
  recognition: string;
  explanation: string;
  moves: TeachingMove[];
  algorithmId?: string;
  repetition?: { group: string; index: number };
  pair?: PairTrace;
  cross?: { distanceBefore: number; distanceAfter: number };
  selection?:
    | {
        policyVersion: 'f2l-v1';
        immediateCost: number;
        nextCost: number;
        compared: number;
      }
    | {
        policyVersion: 'f2l-human-v2';
        current: ExecutionMetrics;
        next: ExecutionMetrics;
        compared: number;
      };
  before: CubeState;
  after: CubeState;
  checkpoint: Checkpoint;
}
export interface TraceStage {
  id: StageId;
  status: 'completed' | 'skipped';
  actions: TraceAction[];
  before: CubeState;
  after: CubeState;
  checkpoint: Checkpoint;
  skipReason?: string;
}
export interface SolveTrace {
  method: MethodId;
  initial: CubeState;
  stages: TraceStage[];
  final: CubeState;
  rouxAdvanced?: Pick<
    import('../roux-lab/types').RouxRoute,
    'frameId' | 'basis' | 'evidence' | 'counts' | 'lseMode'
  > & { modelVersion: 'roux-execution-v1' };
}
export interface SolveLimits {
  maxActions: number;
  maxMoves: number;
}
export interface SolveFailure {
  ok: false;
  code: 'budget' | 'loop' | 'unsupported-case' | 'verification';
  stageId: StageId;
  message: string;
}
export type SolveResult = { ok: true; trace: SolveTrace } | SolveFailure;
export interface SolveSession {
  input: SolveInput;
  trace: SolveTrace;
}
export type SolveInput =
  | { kind: 'scramble'; moves: readonly FaceMove[] }
  | { kind: 'facelets'; facelets: FaceletSnapshot };
