import type { CubeEngine, CubeState, SolveInput, MethodId, SolveResult } from '../core/types';
import { methodAvailable } from '../methods/availability';
import type { RouxAssets } from '../methods/roux/assets';
import type { solveRoux } from '../methods/roux/solve';
import { validateFacelets } from '../core/facelets';
import { resolveSolveInput } from '../core/solve-input';
import { solveLBL } from '../methods/lbl/solve';
import { solveCFOP } from '../methods/cfop/solve';
import { solveAdvancedCFOP } from '../methods/advanced/solve';
import { loadAdvancedAssets, type AdvancedAssets } from '../methods/advanced/assets';
import type { WorkerReply } from './solve-protocol';
type PreparedRequest = {
  requestId: number;
  method: MethodId;
  input: SolveInput;
  initial: CubeState;
};
function prepareSolveRequest(
  engine: CubeEngine,
  request: unknown,
): PreparedRequest | WorkerReply | null {
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
  if ('method' in request && request.method === 'roux-advanced')
    return fail(
      'edition' in request && request.edition === 'club'
        ? 'Advanced Roux uses the progressive club worker. Please start a new solve.'
        : 'Advanced Roux is available only in the club edition.',
    );
  if (
    !('method' in request) ||
    (request.method !== 'lbl' &&
      request.method !== 'cfop-beginner' &&
      request.method !== 'cfop-advanced' &&
      request.method !== 'roux-beginner')
  )
    return fail('Choose a supported teaching method: LBL, Beginner CFOP or Advanced CFOP.');
  const edition = 'edition' in request ? request.edition : 'global';
  if ((edition !== 'club' && edition !== 'global') || !methodAvailable(request.method, edition))
    return fail('This teaching method is available only in the club edition.');
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
  return { requestId, method: request.method, input, initial };
}
export function handleSolveRequest(
  engine: CubeEngine,
  request: unknown,
  advanced?: AdvancedAssets,
): WorkerReply | null {
  const prepared = prepareSolveRequest(engine, request);
  if (!prepared || !('initial' in prepared)) return prepared;
  return solvePrepared(engine, prepared, advanced);
}
function solvePrepared(
  engine: CubeEngine,
  prepared: PreparedRequest,
  advanced?: AdvancedAssets,
): WorkerReply {
  const { requestId, method, input, initial } = prepared;
  if (method === 'roux-beginner')
    return {
      requestId,
      result: {
        ok: false,
        error: { kind: 'solver', message: 'Beginner Roux requires the asynchronous asset loader.' },
      },
    };
  if (method === 'cfop-advanced' && !advanced)
    return {
      requestId,
      result: {
        ok: false,
        error: {
          kind: 'solver',
          message: 'Advanced CFOP assets are unavailable. Please try again.',
        },
      },
    };
  const result =
    method === 'lbl'
      ? solveLBL(engine, initial)
      : method === 'cfop-beginner'
        ? solveCFOP(engine, initial)
        : solveAdvancedCFOP(engine, initial, advanced!);
  return wrapResult(prepared, result);
}
function wrapResult({ requestId, input }: PreparedRequest, result: SolveResult): WorkerReply {
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
export async function handleSolveMessage(
  engine: CubeEngine,
  request: unknown,
  load: () => Promise<AdvancedAssets> = () => loadAdvancedAssets(fetch),
  loadRoux: () => Promise<{ solve: typeof solveRoux; assets: RouxAssets }> = async () => {
    const [{ solveRoux }, { loadRouxAssets }] = await Promise.all([
      import('../methods/roux/solve'),
      import('../methods/roux/assets'),
    ]);
    return { solve: solveRoux, assets: await loadRouxAssets(fetch) };
  },
): Promise<WorkerReply | null> {
  const prepared = prepareSolveRequest(engine, request);
  if (!prepared || !('initial' in prepared)) return prepared;
  try {
    if (prepared.method === 'roux-beginner') {
      const { solve, assets } = await loadRoux();
      return wrapResult(prepared, solve(engine, prepared.initial, assets));
    }
    const assets = prepared.method === 'cfop-advanced' ? await load() : undefined;
    return solvePrepared(engine, prepared, assets);
  } catch (error) {
    return {
      requestId: prepared.requestId,
      result: {
        ok: false,
        error: {
          kind: 'solver',
          message:
            (prepared.method === 'roux-beginner' ? 'Beginner Roux' : 'Advanced CFOP') +
            ' assets could not load: ' +
            (error instanceof Error ? error.message : 'Please try again.'),
        },
      },
    };
  }
}
