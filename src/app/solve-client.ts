import { parseScramble } from '../core/notation';
import type { FaceMove, SolveResult, SolveSession } from '../core/types';
export interface WorkerReply {
  requestId: number;
  result: SolveResult;
}
export interface WorkerPort {
  onmessage: ((e: MessageEvent<WorkerReply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage(value: { requestId: number; moves: FaceMove[] }): void;
  terminate(): void;
}
export type SessionResult =
  | { ok: true; session: SolveSession }
  | {
      ok: false;
      error: {
        kind: 'parse' | 'solver' | 'worker' | 'cancelled';
        message: string;
        offset?: number;
      };
    };
export function createSolveClient(
  factory: () => WorkerPort = () =>
    new Worker(new URL('../workers/solve.worker.ts', import.meta.url), { type: 'module' }),
) {
  let requestId = 0,
    active:
      { id: number; worker: WorkerPort; resolve: (result: SessionResult) => void } | undefined;
  function cancel() {
    if (active) {
      const old = active;
      active = undefined;
      old.worker.terminate();
      old.resolve({
        ok: false,
        error: { kind: 'cancelled', message: 'This solve was cancelled.' },
      });
    }
  }
  return {
    cancel,
    solveScramble(text: string): Promise<SessionResult> {
      cancel();
      const parsed = parseScramble(text);
      if (!parsed.ok)
        return Promise.resolve({
          ok: false,
          error: { kind: 'parse', offset: parsed.offset, message: parsed.message },
        });
      return new Promise((resolve) => {
        try {
          const worker = factory(),
            id = ++requestId;
          active = { id, worker, resolve };
          const finish = (result: SessionResult) => {
            if (active?.id !== id) return;
            active = undefined;
            worker.terminate();
            resolve(result);
          };
          worker.onmessage = ({ data }) => {
            if (data.requestId !== id) return;
            finish(
              data.result.ok
                ? { ok: true, session: { scrambleMoves: parsed.moves, trace: data.result.trace } }
                : {
                    ok: false,
                    error: {
                      kind: 'solver',
                      message: `No verified solution was produced: ${data.result.message}`,
                    },
                  },
            );
          };
          worker.onerror = (event) => {
            event.preventDefault();
            finish({
              ok: false,
              error: { kind: 'worker', message: `The solver could not start: ${event.message}` },
            });
          };
          worker.postMessage({ requestId: id, moves: parsed.moves });
        } catch (error) {
          active?.worker.terminate();
          active = undefined;
          resolve({
            ok: false,
            error: {
              kind: 'worker',
              message:
                error instanceof Error ? error.message : 'Unable to create the solver worker.',
            },
          });
        }
      });
    },
  };
}
