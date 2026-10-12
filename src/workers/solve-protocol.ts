import type { FaceletIssue } from '../core/facelets';
import type { Facelets, FaceMove, SolveSession, MethodId, StageId } from '../core/types';
export type SolveRequestInput =
  { kind: 'scramble'; moves: readonly FaceMove[] } | { kind: 'facelets'; facelets: Facelets };
export interface SolveRequest {
  requestId: number;
  method: MethodId;
  input: SolveRequestInput;
}
export interface WorkerReply {
  requestId: number;
  result:
    | { ok: true; session: SolveSession }
    | {
        ok: false;
        error: {
          kind: 'input' | 'solver';
          message: string;
          issues?: FaceletIssue[];
          stageId?: StageId;
        };
      };
}
