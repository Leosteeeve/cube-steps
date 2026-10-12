import { expect, it } from 'vitest';
import { createSolveClient, type WorkerPort } from './solve-client';
import { createCubeEngine } from '../core/cube';
import { handleSolveRequest } from '../workers/solve-request';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
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
it('returns positioned parse errors without starting a worker', async () => {
  let created = 0;
  const client = createSolveClient(() => {
    created++;
    return new ControlledWorker();
  });
  expect(await client.solveScramble('R M')).toMatchObject({
    ok: false,
    error: { kind: 'parse', offset: 2 },
  });
  expect(created).toBe(0);
});
it('handles worker errors without an unhandled browser error', async () => {
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker),
    pending = client.solveScramble('R');
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
  const first = client.solveScramble('R'),
    late = workers[0].onmessage;
  const second = client.solveScramble('U');
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
  const third = client.solveScramble('');
  client.cancel();
  expect(await third).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
});
it('solves copied color input and restores immutable snapshots after a worker message', async () => {
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker);
  const facelets = structuredClone(GOLDEN_CASES[7].facelets) as any;
  const pending = client.solveFacelets(facelets);
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
  const first = client.solveFacelets(GOLDEN_CASES[0].facelets);
  const late = workers[0].onmessage;
  const second = client.solveScramble('R');
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
  expect(await broken.solveScramble('')).toMatchObject({
    ok: false,
    error: { kind: 'worker', message: 'Blocked worker' },
  });
  const worker = new ControlledWorker(),
    client = createSolveClient(() => worker);
  const pending = client.solveFacelets({} as never);
  const reply = handleSolveRequest(await createCubeEngine(), worker.request);
  if (!reply) throw new Error('Worker request id missing');
  worker.onmessage?.(new MessageEvent('message', { data: reply }));
  expect(await pending).toMatchObject({
    ok: false,
    error: { kind: 'input', issues: [{ code: 'shape' }] },
  });
});
