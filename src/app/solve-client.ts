import { parseScramble } from '../core/notation';
import type { Facelets, SolveSession, MethodId, StageId } from '../core/types';
import type { FaceletIssue } from '../core/facelets';
import type { SolveRequest, SolveRequestInput, WorkerReply } from '../workers/solve-protocol';
import type { CubeEngine, SolveInput } from '../core/types';
import type { RouxSearchClient } from '../roux-lab/client';
import type { RouxRoute } from '../roux-lab/types';
import type { RouxFrameId, FirstBlockEvidence } from '../methods/roux-advanced/types';
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
  edition: 'global' | 'club' = 'global',
  advancedFactory?: (engine: CubeEngine) => RouxSearchClient,
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
  let advancedActive:
    | {
        id: number;
        resolve: (result: SessionResult) => void;
        timer: ReturnType<typeof setTimeout>;
        client?: RouxSearchClient;
        handle?: ReturnType<RouxSearchClient['start']>;
        routes: RouxRoute[];
        evidence: Partial<Record<RouxFrameId, FirstBlockEvidence>>;
      }
    | undefined;
  function cancel() {
    if (advancedActive) {
      const old = advancedActive;
      advancedActive = undefined;
      clearTimeout(old.timer);
      old.handle?.stop();
      old.client?.dispose();
      old.resolve({
        ok: false,
        error: { kind: 'cancelled', message: 'This solve was cancelled.' },
      });
    }
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
  function sendAdvanced(
    input: SolveRequestInput,
    options?: { allowedFrames: readonly RouxFrameId[] },
  ): Promise<SessionResult> {
    if (edition !== 'club')
      return Promise.resolve({
        ok: false,
        error: { kind: 'input', message: 'Advanced Roux is available only in the club edition.' },
      });
    const startedAtEpochMs = performance.timeOrigin + performance.now(),
      id = ++requestId,
      allowedFrames = [...(options?.allowedFrames ?? ['white-blue'])] as RouxFrameId[];
    return new Promise((resolve) => {
      let selection: typeof import('../methods/roux-advanced/selection') | undefined;
      const finish = (result: SessionResult) => {
        if (advancedActive?.id !== id) return;
        const old = advancedActive;
        advancedActive = undefined;
        clearTimeout(old.timer);
        old.handle?.stop();
        old.client?.dispose();
        resolve(result);
      };
      const success = (
        route: RouxRoute,
        evidence = advancedActive?.evidence ?? {},
      ): SessionResult => ({
        ok: true,
        session: freezeReceived({
          input: route.input.source,
          trace: {
            ...route.trace,
            rouxAdvanced: {
              ...route.trace.rouxAdvanced!,
              evidence: selection!.currentRouxEvidence(route, evidence),
            },
          },
        }),
      });
      const timer = setTimeout(() => {
        const r = advancedActive;
        if (r?.id !== id) return;
        const chosen = selection?.selectRouxRoutes(r.routes, r.evidence, 1)[0];
        finish(
          chosen
            ? success(chosen)
            : {
                ok: false,
                error: {
                  kind: 'worker',
                  message:
                    'Advanced Roux reached its time limit before a verified route was ready. Please retry.',
                },
              },
        );
      }, 8000);
      advancedActive = { id, resolve, timer, routes: [], evidence: {} };
      void (async () => {
        try {
          const snapshot = structuredClone(input);
          const [{ createCubeEngine }, { validateFacelets }, routeSelection] = await Promise.all([
            import('../core/cube'),
            import('../core/facelets'),
            import('../methods/roux-advanced/selection'),
          ]);
          selection = routeSelection;
          const { selectRouxRoutes } = routeSelection;
          const engine = await createCubeEngine();
          if (advancedActive?.id !== id) return;
          let source: SolveInput;
          if (snapshot.kind === 'facelets') {
            const checked = validateFacelets(snapshot.facelets, engine.solved());
            if (!checked.ok) {
              finish({
                ok: false,
                error: {
                  kind: 'input',
                  message: checked.issues[0].message,
                  issues: checked.issues,
                },
              });
              return;
            }
            source = { kind: 'facelets', facelets: checked.facelets };
          } else source = snapshot;
          const factory =
            advancedFactory ?? (await import('../roux-lab/client')).createRouxSearchClient;
          if (advancedActive?.id !== id) return;
          const client = factory(engine);
          advancedActive.client = client;
          const agrees = (route: RouxRoute) =>
            route.trace.method === 'roux-advanced' &&
            allowedFrames.includes(route.frameId) &&
            route.trace.rouxAdvanced?.frameId === route.frameId &&
            JSON.stringify(route.input.source) === JSON.stringify(source);
          const handle = client.start(
            source,
            { allowedFrames, mode: 'normal', modelVersion: 'roux-execution-v1' },
            (event) => {
              if (advancedActive?.id !== id) return;
              if (event.kind === 'progress') {
                advancedActive.evidence = event.coverage.frames;
                advancedActive.routes = selectRouxRoutes(
                  advancedActive.routes,
                  advancedActive.evidence,
                  4,
                );
                return;
              }
              if (!agrees(event.route)) {
                finish({
                  ok: false,
                  error: {
                    kind: 'worker',
                    message: 'Advanced Roux returned a different input or frame.',
                  },
                });
                return;
              }
              advancedActive.routes = selectRouxRoutes(
                [...advancedActive.routes, event.route],
                advancedActive.evidence,
                4,
              );
            },
            { startedAtEpochMs },
          );
          if (advancedActive?.id !== id) {
            handle.stop();
            client.dispose();
            return;
          }
          advancedActive.handle = handle;
          const result = await handle.done;
          if (advancedActive?.id !== id) return;
          if (!result.ok) {
            finish({ ok: false, error: { kind: 'solver', message: result.message } });
            return;
          }
          const route = result.routes[0];
          finish(
            route && agrees(route)
              ? success(route, result.coverage.frames)
              : {
                  ok: false,
                  error: {
                    kind: 'worker',
                    message: 'Advanced Roux returned a different input or frame.',
                  },
                },
          );
        } catch (error) {
          finish({
            ok: false,
            error: {
              kind: 'worker',
              message: error instanceof Error ? error.message : 'Unable to start Advanced Roux.',
            },
          });
        }
      })();
    });
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
        worker.postMessage({ requestId: id, method, input: structuredClone(sentInput), edition });
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
    solveScramble(
      text: string,
      method: MethodId,
      options?: { allowedFrames: readonly RouxFrameId[] },
    ): Promise<SessionResult> {
      cancel();
      const parsed = parseScramble(text);
      if (!parsed.ok)
        return Promise.resolve({
          ok: false,
          error: { kind: 'parse', offset: parsed.offset, message: parsed.message },
        });
      return method === 'roux-advanced'
        ? sendAdvanced({ kind: 'scramble', moves: parsed.moves }, options)
        : send({ kind: 'scramble', moves: parsed.moves }, method);
    },
    solveFacelets(
      facelets: Facelets,
      method: MethodId,
      options?: { allowedFrames: readonly RouxFrameId[] },
    ): Promise<SessionResult> {
      cancel();
      return method === 'roux-advanced'
        ? sendAdvanced({ kind: 'facelets', facelets }, options)
        : send({ kind: 'facelets', facelets }, method);
    },
  };
}
