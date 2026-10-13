import type {
  CubeEngine,
  CubeState,
  MethodId,
  SolveFailure,
  StageId,
  TeachingMove,
  TraceAction,
} from '../core/types';
export type StageResult = { ok: true; state: CubeState } | SolveFailure;
export interface StageDefinition {
  id: StageId;
  label: string;
  group: string;
}
export interface TeachingAlgorithm {
  name: string;
  moves: TeachingMove[];
  precondition: string;
  effect: string;
  segments?: { label: string; start: number; end: number }[];
}
export interface MethodPresentation {
  id: MethodId;
  label: string;
  stages: readonly StageDefinition[];
  teachingStatus: 'accepted' | 'preview';
  algorithms: Readonly<Record<string, TeachingAlgorithm>>;
}
export interface MethodRuntime {
  presentation: MethodPresentation;
  checkStage(engine: CubeEngine, state: CubeState, id: StageId): boolean;
  checkAction(engine: CubeEngine, action: TraceAction, stage: StageId): boolean;
}
