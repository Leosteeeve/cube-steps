import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createPracticeClient, type PracticeWorkerPort } from './practice-client';
import type { PracticeRequest, PracticeReply } from '../../workers/practice-protocol';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { handlePracticeRequest } from '../../workers/practice-request';
class ControlledWorker implements PracticeWorkerPort {
  onmessage: PracticeWorkerPort['onmessage'] = null;
  onerror: PracticeWorkerPort['onerror'] = null;
  request!: PracticeRequest;
  terminated = false;
  postMessage(request: PracticeRequest) {
    this.request = request;
  }
  terminate() {
    this.terminated = true;
  }
  send(reply: PracticeReply) {
    this.onmessage?.(new MessageEvent('message', { data: reply }));
  }
}
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(() => vi.useRealTimers());
const args = ['oll-20', 'oll-20/u0', 'oll-20/main'] as const;
it('drops_replies_after_pool_change', async () => {
  const workers: ControlledWorker[] = [],
    client = createPracticeClient(() => {
      const w = new ControlledWorker();
      workers.push(w);
      return w;
    });
  const a = client.generate(...args),
    old = workers[0].onmessage;
  const b = client.generate('pll-z', 'pll-z/u0', 'pll-z/main');
  expect(await a).toMatchObject({ ok: false });
  expect(workers[0].terminated).toBe(true);
  const reply = handlePracticeRequest(engine, workers[0].request)!;
  old?.(new MessageEvent('message', { data: reply }));
  old?.(
    new MessageEvent('message', {
      data: { ...reply, result: { ok: false, message: 'Late failure' } },
    }),
  );
  expect(workers[1].terminated).toBe(false);
  workers[1].send(handlePracticeRequest(engine, workers[1].request)!);
  const result = await b;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.exercise.caseId).toBe('pll-z');
    expect(Object.isFrozen(result.exercise.demonstration.initial.data)).toBe(true);
  }
});
it.each(['caseId', 'fixtureId', 'variantId', 'exercise', 'demonstration'])(
  'rejects mismatched %s even with the right request number',
  async (field) => {
    const w = new ControlledWorker(),
      client = createPracticeClient(() => w),
      pending = client.generate(...args);
    const reply = structuredClone(handlePracticeRequest(engine, w.request)!);
    if (field === 'exercise' && reply.result.ok) reply.result.exercise.caseId = 'pll-z';
    else if (field === 'demonstration' && reply.result.ok)
      reply.result.exercise.demonstration.fixtureId = 'pll-z/u0';
    else (reply as any)[field] = 'wrong';
    w.send(reply);
    expect(await pending).toMatchObject({ ok: false });
    expect(w.terminated).toBe(true);
  },
);
it('settles cancellation, timeouts, startup errors and post failures', async () => {
  vi.useFakeTimers();
  let w = new ControlledWorker(),
    client = createPracticeClient(() => w);
  let p = client.generate(...args);
  expect(vi.getTimerCount()).toBe(1);
  client.cancel();
  expect(await p).toMatchObject({ ok: false });
  expect(vi.getTimerCount()).toBe(0);
  w = new ControlledWorker();
  p = client.generate(...args);
  await vi.advanceTimersByTimeAsync(30000);
  expect(await p).toMatchObject({ ok: false, message: expect.stringMatching(/timed out/) });
  expect(w.terminated).toBe(true);
  w = new ControlledWorker();
  p = client.generate(...args);
  const event = Object.assign(new Event('error', { cancelable: true }), {
    message: 'No worker',
  }) as ErrorEvent;
  w.onerror!(event);
  expect(await p).toMatchObject({ ok: false });
  expect(event.defaultPrevented).toBe(true);
  expect(
    await createPracticeClient(() => {
      throw Error('Blocked');
    }).generate(...args),
  ).toMatchObject({ ok: false });
  w = new ControlledWorker();
  w.postMessage = () => {
    throw Error('Post failed');
  };
  expect(await client.generate(...args)).toMatchObject({ ok: false });
  expect(w.terminated).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
