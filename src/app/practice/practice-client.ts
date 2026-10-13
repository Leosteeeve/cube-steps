import type { PracticeRequest, PracticeReply } from '../../workers/practice-protocol';
export interface PracticeWorkerPort {
  onmessage: ((e: MessageEvent<PracticeReply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage(value: PracticeRequest): void;
  terminate(): void;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function createPracticeClient(
  factory: () => PracticeWorkerPort = () =>
    new Worker(new URL('../../workers/practice.worker.ts', import.meta.url), { type: 'module' }),
) {
  let sequence = 0,
    active:
      | {
          id: number;
          worker: PracticeWorkerPort;
          resolve: (result: PracticeReply['result']) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      | undefined;
  function cancel() {
    if (active) {
      const old = active;
      active = undefined;
      clearTimeout(old.timer);
      old.worker.terminate();
      old.resolve({ ok: false, message: 'This exercise was cancelled.' });
    }
  }
  function generate(
    caseId: string,
    fixtureId: string,
    variantId: string,
  ): Promise<PracticeReply['result']> {
    cancel();
    return new Promise((resolve) => {
      const id = ++sequence;
      let worker: PracticeWorkerPort | undefined;
      const finish = (result: PracticeReply['result']) => {
        if (active?.id !== id) return;
        clearTimeout(active.timer);
        active = undefined;
        worker!.terminate();
        resolve(result);
      };
      try {
        worker = factory();
        const timer = setTimeout(
          () => finish({ ok: false, message: 'The exercise timed out. Please try again.' }),
          30000,
        );
        active = { id, worker, resolve, timer };
        const matches = (
          v: { caseId?: string; fixtureId?: string; variantId?: string } | undefined,
        ) => v?.caseId === caseId && v?.fixtureId === fixtureId && v?.variantId === variantId;
        worker.onmessage = ({ data }) => {
          if (active?.id !== id || !data || data.requestId !== id) return;
          try {
            if (
              !matches(data) ||
              !data.result ||
              typeof data.result.ok !== 'boolean' ||
              (data.result.ok &&
                (!matches(data.result.exercise) || !matches(data.result.exercise?.demonstration)))
            )
              return finish({
                ok: false,
                message: 'The worker returned a different exercise. Please try again.',
              });
            finish(
              data.result.ok
                ? { ok: true, exercise: freeze(data.result.exercise) }
                : {
                    ok: false,
                    message:
                      typeof data.result.message === 'string'
                        ? data.result.message
                        : 'The exercise could not load.',
                  },
            );
          } catch {
            finish({
              ok: false,
              message: 'The exercise reply could not be checked. Please try again.',
            });
          }
        };
        worker.onerror = (event) => {
          event.preventDefault();
          finish({ ok: false, message: 'The exercise worker could not start: ' + event.message });
        };
        worker.postMessage({ requestId: id, caseId, fixtureId, variantId });
      } catch (e) {
        if (active?.id === id) {
          clearTimeout(active.timer);
          active = undefined;
        }
        worker?.terminate();
        resolve({
          ok: false,
          message: e instanceof Error ? e.message : 'The exercise worker could not start.',
        });
      }
    });
  }
  return { generate, cancel };
}
