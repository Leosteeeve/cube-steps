import { expect, it } from 'vitest';
import { createSolveClient, type WorkerPort } from './solve-client';
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
        result: { ok: false, code: 'verification', stageId: 'white-cross', message: 'old' },
      },
    }),
  );
  workers[1].onmessage?.(
    new MessageEvent('message', {
      data: {
        requestId: workers[1].request.requestId,
        result: { ok: false, code: 'budget', stageId: 'white-cross', message: 'new' },
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
