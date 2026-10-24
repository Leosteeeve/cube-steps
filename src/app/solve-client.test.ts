import { expect, it, vi } from 'vitest';
import { createSolveClient, type WorkerPort } from './solve-client';
import { createCubeEngine } from '../core/cube';
import { handleSolveRequest } from '../workers/solve-request';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
import type { RouxSearchClient } from '../roux-lab/client';
import type { AdvancedRouxOutcome } from '../roux-lab/types';
it('delegates Advanced Roux only for club requests with normal default or explicit frames', async () => {
  const start = vi.fn<RouxSearchClient['start']>(() => ({
    stop() {},
    done: Promise.resolve({
      ok: false,
      code: 'budget',
      message: 'fixture stop',
      coverage: {
        elapsedMs: 0,
        operations: 0,
        entries: 0,
        retainedBytes: 0,
        frames: {},
        verifiedRoutes: 0,
        reason: 'work-limit',
      },
    }),
  }));
  const advanced = vi.fn(() => ({ start, dispose() {} })),
    ordinary = vi.fn(() => new ControlledWorker());
  const global = createSolveClient(ordinary, 'global', advanced);
  expect((await global.solveScramble('R', 'roux-advanced')).ok).toBe(false);
  expect(advanced).not.toHaveBeenCalled();
  expect(ordinary).not.toHaveBeenCalled();
  const club = createSolveClient(ordinary, 'club', advanced);
  await club.solveScramble('R', 'roux-advanced');
  expect(start.mock.calls[0][1]).toEqual({
    allowedFrames: ['white-blue'],
    mode: 'normal',
    modelVersion: 'roux-execution-v1',
  });
  expect(start.mock.calls[0][3]?.startedAtEpochMs).toBeGreaterThan(0);
  await club.solveScramble('U', 'roux-advanced', { allowedFrames: ['yellow-red', 'white-green'] });
  expect(start.mock.calls[1][1].allowedFrames).toEqual(['yellow-red', 'white-green']);
  expect(ordinary).not.toHaveBeenCalled();
  club.cancel();
});
it('invalidates Advanced Roux after import or a replacement method and resolves cancellation', async () => {
  const start = vi.fn<RouxSearchClient['start']>(() => ({
      stop() {},
      done: new Promise<AdvancedRouxOutcome>(() => {}),
    })),
    advanced = vi.fn(() => ({ start, dispose() {} }));
  const client = createSolveClient(() => new ControlledWorker(), 'club', advanced),
    old = client.solveScramble('R', 'roux-advanced');
  client.cancel();
  expect(await old).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
  await new Promise((r) => setTimeout(r, 0));
  expect(start).not.toHaveBeenCalled();
});
class ControlledWorker implements WorkerPort {
  onmessage: WorkerPort['onmessage'] = null;
  onerror: WorkerPort['onerror'] = null;
  terminated = false;
  request: any;
  postMessage(value: unknown) {
    this.request = value;
  }
  terminate() {
    this.terminated = true;
  }
}
it('sends club identity and ignores a late Roux request after replacement', async () => {
  const workers: ControlledWorker[] = [];
  const client = createSolveClient(() => {
    const w = new ControlledWorker();
    workers.push(w);
    return w;
  }, 'club');
  const old = client.solveScramble('R', 'roux-beginner');
  expect(workers[0].request).toMatchObject({ edition: 'club', method: 'roux-beginner' });
  const late = workers[0].onmessage;
  const next = client.solveScramble('U', 'roux-beginner');
  expect(await old).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
  late?.(
    new MessageEvent('message', {
      data: { requestId: 1, result: { ok: false, error: { kind: 'solver', message: 'old' } } },
    }),
  );
  expect(workers[1].terminated).toBe(false);
  client.cancel();
  expect(await next).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
});
it('cancels_during_asset_load_and_clears_watchdogs', async () => {
  vi.useFakeTimers();
  try {
    const workers: ControlledWorker[] = [],
      client = createSolveClient(() => {
        const w = new ControlledWorker();
        workers.push(w);
        return w;
      });
    const pending = client.solveScramble('R', 'cfop-advanced');
    expect(vi.getTimerCount()).toBe(1);
    client.cancel();
    expect(await pending).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
    expect(workers[0].terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    const next = client.solveScramble('R', 'cfop-advanced');
    await vi.advanceTimersByTimeAsync(30000);
    expect(await next).toMatchObject({
      ok: false,
      error: { kind: 'worker', message: expect.stringMatching(/timed out|try again/i) },
    });
    expect(workers[1].terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
it('rejects_a_reply_for_changed_input_provenance', async () => {
  const w = new ControlledWorker(),
    client = createSolveClient(() => w),
    pending = client.solveScramble('R', 'lbl');
  const reply = handleSolveRequest(await createCubeEngine(), {
    ...w.request,
    input: { kind: 'scramble', moves: ['U'] },
  });
  if (!reply) throw new Error('Missing reply');
  w.onmessage?.(new MessageEvent('message', { data: reply }));
  expect(await pending).toMatchObject({ ok: false, error: { kind: 'worker' } });
});
it('rejects a current reply for another method and settles its promise', async () => {
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker);
  const pending = client.solveScramble('', 'cfop-beginner');
  const reply = handleSolveRequest(await createCubeEngine(), { ...worker.request, method: 'lbl' });
  if (!reply) throw new Error('Missing reply');
  worker.onmessage?.(new MessageEvent('message', { data: reply }));
  expect(await pending).toMatchObject({
    ok: false,
    error: { kind: 'worker', message: expect.stringContaining('method') },
  });
  expect(worker.terminated).toBe(true);
});
it('cancels an old method and ignores its late successful result', async () => {
  const workers: ControlledWorker[] = [],
    client = createSolveClient(() => {
      const w = new ControlledWorker();
      workers.push(w);
      return w;
    });
  const first = client.solveScramble('R', 'lbl'),
    late = workers[0].onmessage;
  const second = client.solveScramble('U', 'cfop-beginner');
  expect(await first).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
  const engine = await createCubeEngine();
  late?.(new MessageEvent('message', { data: handleSolveRequest(engine, workers[0].request)! }));
  expect(workers[1].terminated).toBe(false);
  workers[1].onmessage?.(
    new MessageEvent('message', { data: handleSolveRequest(engine, workers[1].request)! }),
  );
  expect(await second).toMatchObject({ ok: true, session: { trace: { method: 'cfop-beginner' } } });
});
it('returns positioned parse errors without starting a worker', async () => {
  let created = 0;
  const client = createSolveClient(() => {
    created++;
    return new ControlledWorker();
  });
  expect(await client.solveScramble('R M', 'lbl')).toMatchObject({
    ok: false,
    error: { kind: 'parse', offset: 2 },
  });
  expect(created).toBe(0);
});
it('handles worker errors without an unhandled browser error', async () => {
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker),
    pending = client.solveScramble('R', 'lbl');
  const event = Object.assign(new Event('error', { cancelable: true }), {
    message: 'worker unavailable',
  }) as ErrorEvent;
  worker.onerror?.(event);
  expect(event.defaultPrevented).toBe(true);
  expect(await pending).toMatchObject({
    ok: false,
    error: { kind: 'worker', message: expect.stringContaining('worker unavailable') },
  });
});
it('settles cancellation and prevents late replies replacing a newer solve', async () => {
  const workers: ControlledWorker[] = [];
  const client = createSolveClient(() => {
    const w = new ControlledWorker();
    workers.push(w);
    return w;
  });
  const first = client.solveScramble('R', 'lbl'),
    late = workers[0].onmessage;
  const second = client.solveScramble('U', 'lbl');
  expect(await first).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
  expect(workers[0].terminated).toBe(true);
  late?.(
    new MessageEvent('message', {
      data: {
        requestId: workers[0].request.requestId,
        result: { ok: false, error: { kind: 'solver', message: 'old' } },
      },
    }),
  );
  workers[1].onmessage?.(
    new MessageEvent('message', {
      data: {
        requestId: workers[1].request.requestId,
        result: { ok: false, error: { kind: 'solver', message: 'new' } },
      },
    }),
  );
  expect(await second).toMatchObject({
    ok: false,
    error: { kind: 'solver', message: expect.stringContaining('new') },
  });
  const third = client.solveScramble('', 'lbl');
  client.cancel();
  expect(await third).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
});
it('solves copied color input and restores immutable snapshots after a worker message', async () => {
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker);
  const facelets = structuredClone(GOLDEN_CASES[7].facelets) as any;
  const pending = client.solveFacelets(facelets, 'lbl');
  facelets.F[0] = null;
  const engine = await createCubeEngine();
  const reply = handleSolveRequest(engine, worker.request);
  if (!reply) throw new Error('Worker request id missing');
  worker.onmessage?.(new MessageEvent('message', { data: structuredClone(reply) }));
  const result = await pending;
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  expect(result.session.input).toEqual({ kind: 'facelets', facelets: GOLDEN_CASES[7].facelets });
  expect(Object.isFrozen(result.session.trace.initial.data.EDGES.pieces)).toBe(true);
  if (result.session.input.kind === 'facelets')
    expect(Object.isFrozen(result.session.input.facelets.F)).toBe(true);
  expect(worker.terminated).toBe(true);
});
it('cancels across input kinds and ignores a reply with the wrong request id', async () => {
  const workers: ControlledWorker[] = [],
    client = createSolveClient(() => {
      const worker = new ControlledWorker();
      workers.push(worker);
      return worker;
    });
  const first = client.solveFacelets(GOLDEN_CASES[0].facelets, 'lbl');
  const late = workers[0].onmessage;
  const second = client.solveScramble('R', 'lbl');
  expect(await first).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
  late?.(
    new MessageEvent('message', {
      data: {
        requestId: workers[0].request.requestId,
        result: { ok: false, error: { kind: 'input', message: 'old' } },
      },
    }),
  );
  workers[1].onmessage?.(
    new MessageEvent('message', {
      data: { requestId: -1, result: { ok: false, error: { kind: 'input', message: 'wrong' } } },
    }),
  );
  const reply = handleSolveRequest(await createCubeEngine(), workers[1].request);
  if (!reply) throw new Error('Worker request id missing');
  workers[1].onmessage?.(new MessageEvent('message', { data: structuredClone(reply) }));
  expect(await second).toMatchObject({
    ok: true,
    session: { input: { kind: 'scramble', moves: ['R'] } },
  });
});
it('settles factory failures and passes structured input issues to the editor', async () => {
  const broken = createSolveClient(() => {
    throw new Error('Blocked worker');
  });
  expect(await broken.solveScramble('', 'lbl')).toMatchObject({
    ok: false,
    error: { kind: 'worker', message: 'Blocked worker' },
  });
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker);
  const pending = client.solveFacelets({} as never, 'lbl');
  const reply = handleSolveRequest(await createCubeEngine(), worker.request);
  if (!reply) throw new Error('Worker request id missing');
  worker.onmessage?.(new MessageEvent('message', { data: reply }));
  expect(await pending).toMatchObject({
    ok: false,
    error: { kind: 'input', issues: [{ code: 'shape' }] },
  });
});
