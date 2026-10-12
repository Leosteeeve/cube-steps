export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type FaceMove = `${Face}${'' | "'" | '2'}`;
export type TeachingMove = FaceMove | `${'x' | 'y' | 'z'}${'' | "'" | '2'}`;
export type Color = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';
export interface CubeState { data: Record<string, {pieces: number[]; orientation: number[]; orientationMod?: number[]}> }
export interface PieceObservation { id: string; slot: string; stickers: Partial<Record<Face, Color>> }
export interface CubeObservation { centers: Record<Face,Color>; edges: PieceObservation[]; corners: PieceObservation[] }
export interface CubeEngine {
  solved(): CubeState;
  apply(state: CubeState, moves: readonly TeachingMove[]): CubeState;
  observe(state: CubeState): CubeObservation;
  isSolved(state: CubeState): boolean;
  equals(a: CubeState, b: CubeState): boolean;
}
export type StageId = 'white-cross'|'first-layer'|'middle-layer'|'top-cross'|'top-edges'|'top-corners'|'corner-orientation';
export interface Checkpoint { id:string; description:string; passed:boolean }
export interface TraceAction {
  kind:'setup'|'algorithm'|'regrip'; ruleId:string; caseId:string;
  targets:string[]; recognition:string; explanation:string; moves:TeachingMove[];
  algorithmId?:string; repetition?:{group:string; index:number};
  before:CubeState; after:CubeState; checkpoint:Checkpoint;
}
export interface TraceStage {
  id:StageId; status:'completed'|'skipped'; actions:TraceAction[];
  before:CubeState; after:CubeState; checkpoint:Checkpoint; skipReason?:string;
}
export interface SolveTrace { method:'lbl'; initial:CubeState; stages:TraceStage[]; final:CubeState }
export interface SolveLimits {maxActions:number;maxMoves:number}
export interface SolveFailure {ok:false;code:'budget'|'loop'|'unsupported-case'|'verification';stageId:StageId;message:string}
export type SolveResult = {ok:true;trace:SolveTrace}|SolveFailure;
export interface SolveSession {scrambleMoves:FaceMove[];trace:SolveTrace}
