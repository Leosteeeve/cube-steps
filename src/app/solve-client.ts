import { parseScramble } from '../core/notation';
import type { Facelets, SolveSession, MethodId, StageId } from '../core/types';
import type { FaceletIssue } from '../core/facelets';
import type { SolveRequest, SolveRequestInput, WorkerReply } from '../workers/solve-protocol';
export type { WorkerReply } from '../workers/solve-protocol';
export interface WorkerPort {
  onmessage: ((e: MessageEvent<WorkerReply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage(value: SolveRequest): void;
  terminate(): void;
}
export type SessionResult =
  | { ok: true; session: SolveSession }
  | {
      ok: false;
      error: {
        kind: 'parse' | 'input' | 'solver' | 'worker' | 'cancelled';
        message: string;
        offset?: number;
        issues?: FaceletIssue[];
        stageId?: StageId;
      };
    };
// Worker messages are cloned by the browser, which removes Object.freeze.
function freezeReceived<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeReceived(child);
    Object.freeze(value);
  }
  return value;
}
export function createSolveClient(
  factory: () => WorkerPort = () =>
    new Worker(new URL('../workers/solve.worker.ts', import.meta.url), { type: 'module' }),
) {
  let requestId = 0,
    active:
      | {
          id: number;
          worker: WorkerPort;
          resolve: (result: SessionResult) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      | undefined;
  function cancel() {
    if (active) {
      const old = active;
      active = undefined;
      clearTimeout(old.timer);
      old.worker.terminate();
      old.resolve({
        ok: false,
        error: { kind: 'cancelled', message: 'This solve was cancelled.' },
      });
    }
  }
  function send(input: SolveRequestInput, method: MethodId): Promise<SessionResult> {
    return new Promise((resolve) => {
      try {
        const sentInput = structuredClone(input);
        const fingerprint = (value: SolveRequestInput) =>
          JSON.stringify(
            value.kind === 'scramble'
              ? ['scramble', value.moves]
              : [
                  'facelets',
                  ...(['U', 'R', 'F', 'D', 'L', 'B'] as const).map((face) => value.facelets[face]),
                ],
          );
        const worker = factory(),
          id = ++requestId;
        const finish = (result: SessionResult) => {
          if (active?.id !== id) return;
          clearTimeout(active.timer);
          active = undefined;
          worker.terminate();
          resolve(result);
        };
        const timer = setTimeout(
          () =>
            finish({
              ok: false,
              error: { kind: 'worker', message: 'The solver timed out. Please try again.' },
            }),
          30000,
        );
        active = { id, worker, resolve, timer };
        worker.onmessage = ({ data }) => {
          if (data.requestId !== id) return;
          if (data.result.ok && data.result.session?.trace?.method !== method) {
            finish({
              ok: false,
              error: {
                kind: 'worker',
                message: 'The worker returned a solution for the wrong method. Please solve again.',
              },
            });
            return;
          }
          if (data.result.ok && fingerprint(data.result.session.input) !== fingerprint(sentInput)) {
            finish({
              ok: false,
              error: {
                kind: 'worker',
                message: 'The worker returned a solution for different input. Please solve again.',
              },
            });
            return;
          }
          finish(
            data.result.ok
              ? { ok: true, session: freezeReceived(data.result.session) }
              : data.result,
          );
        };
        worker.onerror = (event) => {
          event.preventDefault();
          finish({
            ok: false,
            error: { kind: 'worker', message: `The solver could not start: ${event.message}` },
          });
        };
        worker.postMessage({ requestId: id, method, input: structuredClone(sentInput) });
      } catch (error) {
        if (active) clearTimeout(active.timer);
        active?.worker.terminate();
        active = undefined;
        resolve({
          ok: false,
          error: {
            kind: 'worker',
            message: error instanceof Error ? error.message : 'Unable to create the solver worker.',
          },
        });
      }
    });
  }
  return {
    cancel,
    solveScramble(text: string, method: MethodId): Promise<SessionResult> {
      cancel();
      const parsed = parseScramble(text);
      if (!parsed.ok)
        return Promise.resolve({
          ok: false,
          error: { kind: 'parse', offset: parsed.offset, message: parsed.message },
        });
      return send({ kind: 'scramble', moves: parsed.moves }, method);
    },
    solveFacelets(facelets: Facelets, method: MethodId): Promise<SessionResult> {
      cancel();
      return send({ kind: 'facelets', facelets }, method);
    },
  };
}
