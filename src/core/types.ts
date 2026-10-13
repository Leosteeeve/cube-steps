export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type FaceMove = `${Face}${'' | "'" | '2'}`;
export type TeachingMove =
  FaceMove | `${`${Face}w` | 'x' | 'y' | 'z' | 'M' | 'E' | 'S'}${'' | "'" | '2'}`;
export type MethodId = 'lbl' | 'cfop-beginner' | 'cfop-advanced';
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
export type StageId = LBLStageId | CFOPStageId | AdvancedStageId;
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
export interface TraceAction {
  kind: 'setup' | 'algorithm' | 'regrip';
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
  selection?: {
    policyVersion: 'f2l-v1';
    immediateCost: number;
    nextCost: number;
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
