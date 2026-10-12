import type { CubeEngine, CubeState, SolveInput } from '../core/types';
import { validateFacelets } from '../core/facelets';
import { resolveSolveInput } from '../core/solve-input';
import { solveLBL } from '../methods/lbl/solve';
import { solveCFOP } from '../methods/cfop/solve';
import type { WorkerReply } from './solve-protocol';
export function handleSolveRequest(engine: CubeEngine, request: unknown): WorkerReply | null {
  if (
    !request ||
    typeof request !== 'object' ||
    !('requestId' in request) ||
    typeof request.requestId !== 'number' ||
    !Number.isSafeInteger(request.requestId) ||
    request.requestId < 0
  )
    return null;
  const requestId = request.requestId;
  const fail = (message: string): WorkerReply => ({
    requestId,
    result: { ok: false, error: { kind: 'input', message } },
  });
  if (!('method' in request) || (request.method !== 'lbl' && request.method !== 'cfop-beginner')) return fail('Choose a supported teaching method: LBL or Beginner CFOP.');
  if (
    !('input' in request) ||
    !request.input ||
    typeof request.input !== 'object' ||
    !('kind' in request.input)
  )
    return fail('Choose a scramble or enter all six faces.');
  const raw = request.input;
  let input: SolveInput, initial: CubeState;
  if (raw.kind === 'facelets') {
    const checked = validateFacelets('facelets' in raw ? raw.facelets : undefined, engine.solved());
    if (!checked.ok)
      return {
        requestId,
        result: {
          ok: false,
          error: { kind: 'input', message: checked.issues[0].message, issues: checked.issues },
        },
      };
    input = { kind: 'facelets', facelets: checked.facelets };
    initial = checked.state;
  } else if (raw.kind === 'scramble') {
    try {
      input = {
        kind: 'scramble',
        moves: 'moves' in raw ? structuredClone(raw.moves) : undefined,
      } as SolveInput;
      initial = resolveSolveInput(engine, input);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Invalid scramble input.');
    }
  } else return fail('This input mode is not supported.');
  const result = request.method === 'lbl' ? solveLBL(engine, initial) : solveCFOP(engine, initial);
  return {
    requestId,
    result: result.ok
      ? { ok: true, session: { input, trace: result.trace } }
      : {
          ok: false,
          error: {
            kind: 'solver',
            stageId: result.stageId,
            message: `No verified solution was produced: ${result.message}`,
          },
        },
  };
}
