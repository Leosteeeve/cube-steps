import { createCubeEngine } from '../core/cube';
import type { FaceMove, SolveResult } from '../core/types';
import { solveLBL } from '../methods/lbl/solve';
self.onmessage = async (event: MessageEvent<{ requestId: number; moves: FaceMove[] }>) => {
  const { requestId, moves } = event.data;
  let result: SolveResult;
  try {
    const engine = await createCubeEngine();
    result = solveLBL(engine, engine.apply(engine.solved(), moves));
  } catch (error) {
    result = {
      ok: false,
      code: 'verification',
      stageId: 'white-cross',
      message: error instanceof Error ? error.message : 'Unexpected solver error.',
    };
  }
  self.postMessage({ requestId, result });
};
