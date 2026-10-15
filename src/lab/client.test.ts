import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { labContext, fixtureLabRoute } from '../../tests/fixtures/lab-context';
import { prepareLabInput } from './input';
import { validateLabRoute } from './validate';
import { createLabClient } from './client';
import { LabStopped } from './budget';
import { createExperiment } from './experiments/snapshots';
import { isLabCoverage } from '../workers/lab-protocol';
import type { LabWorkerPort, LabReply, LabRequest } from '../workers/lab-protocol';
import type { LabRoute } from './types';
let context: ReturnType<typeof labContext>, route: LabRoute;
const input = { kind: 'scramble' as const, moves: ['R', 'U'] as const },
  settings = { allowedColors: ['white'] as const, modelVersion: 'lab-execution-v1' as const };
beforeAll(async () => {
  context = labContext(await createCubeEngine());
  route = fixtureLabRoute(context.engine, prepareLabInput(context.engine, input));
});
afterEach(() => vi.useRealTimers());
class Port implements LabWorkerPort {
  onmessage: LabWorkerPort['onmessage'] = null;
  onerror: LabWorkerPort['onerror'] = null;
  terminated = false;
  request!: LabRequest;
  postMessage(value: LabRequest) {
    this.request = value;
  }
  terminate() {
    this.terminated = true;
  }
  reply(reply: LabReply) {
    this.onmessage?.(new MessageEvent('message', { data: reply }));
  }
}
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
function setup(overrides: NonNullable<Parameters<typeof createLabClient>[0]> = {}) {
  const ports: Port[] = [];
  const verify = vi.fn(async (prepared: ReturnType<typeof prepareLabInput>, raw: unknown) =>
    validateLabRoute(context, prepared, raw, 'current'),
  );
  const client = createLabClient({
    factory: () => {
      const p = new Port();
      ports.push(p);
      return p;
    },
    now: () => Date.now(),
    prepare: async (raw) => prepareLabInput(context.engine, raw),
    verify,
    ...overrides,
  });
  return { ports, client, verify };
}
it('creates workers lazily and leaves 100ms scheduling headroom under the 30.5-second watchdog', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const { client, ports } = setup();
  expect(ports).toHaveLength(0);
  client.analyze(input, settings);
  expect(ports[0].request).toMatchObject({ startedAt: 1000, deadlineAt: 31000 });
  await vi.advanceTimersByTimeAsync(30399);
  expect(ports[0].terminated).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(ports[0].terminated).toBe(true);
  expect(client.snapshot()).toMatchObject({
    phase: 'stopped',
    issue: { code: 'timeout' },
    coverage: { elapsedMs: 30400, reason: 'time-limit' },
  });
  expect(vi.getTimerCount()).toBe(0);
  client.dispose();
});
it('retains independently verified incumbents on Stop and drops queued or late replies', async () => {
  const { client, ports, verify } = setup();
  client.analyze(input, settings);
  await flush();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  expect(verify).toHaveBeenCalledTimes(1);
  expect(client.snapshot().routes[0].route.id).toBe(route.id);
  const late = ports[0].onmessage;
  client.stop();
  late?.(new MessageEvent('message', { data: { kind: 'candidate', requestId: 1, route } }));
  await flush();
  expect(client.snapshot()).toMatchObject({ phase: 'stopped', recommendedRouteId: route.id });
  expect(verify).toHaveBeenCalledTimes(1);
  client.dispose();
});
it('cancels validation already awaiting a result and ignores superseded requests', async () => {
  let finish: ((value: ReturnType<typeof validateLabRoute>) => void) | undefined;
  const { client, ports } = setup({
    verify: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  client.analyze(input, settings);
  await flush();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  const late = ports[0].onmessage;
  client.stop();
  finish!(validateLabRoute(context, prepareLabInput(context.engine, input), route, 'current'));
  await flush();
  expect(client.snapshot().routes).toEqual([]);
  client.analyze({ kind: 'scramble', moves: ['U'] }, settings);
  await flush();
  late?.(
    new MessageEvent('message', {
      data: { kind: 'error', requestId: 1, code: 'search', message: 'old error' },
    }),
  );
  expect(client.snapshot().requestId).toBe(2);
  expect(client.snapshot().phase).not.toBe('error');
  client.dispose();
});
it('rejects mismatched fingerprints, malformed candidates and conflicting duplicate IDs', async () => {
  const { client, ports, verify } = setup();
  client.analyze(input, settings);
  await flush();
  ports[0].reply({
    kind: 'candidate',
    requestId: 1,
    route: { ...route, inputFingerprint: 'forged' },
  });
  await flush();
  expect(client.snapshot().routes).toEqual([]);
  expect(verify).not.toHaveBeenCalled();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  expect(verify).toHaveBeenCalledTimes(1);
  const changed = structuredClone(route);
  if (changed.score.rated) changed.score.cost++;
  ports[0].reply({ kind: 'candidate', requestId: 1, route: changed });
  await flush();
  expect(verify).toHaveBeenCalledTimes(1);
  ports[0].reply({ kind: 'candidate', requestId: 1, route: { id: 'bad' } as LabRoute });
  await flush();
  expect(client.snapshot().routes[0].route.id).toBe(route.id);
  expect(client.snapshot().issue?.code).toBe('protocol');
  client.dispose();
});
it('keeps input errors, verification failures and asset/worker failures distinct', async () => {
  const { client, ports } = setup({
    verify: async () => {
      throw Error('replay mismatch');
    },
  });
  client.analyze(input, settings);
  await flush();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  expect(client.snapshot().issue?.code).toBe('verification');
  ports[0].reply({ kind: 'error', requestId: 1, code: 'assets', message: 'asset missing' });
  expect(client.snapshot()).toMatchObject({
    phase: 'error',
    issue: { code: 'assets' },
    coverage: { reason: 'error' },
  });
  client.dispose();
  const failed = setup({
    prepare: async () => {
      throw Error('illegal cube');
    },
  });
  failed.client.analyze(input, settings);
  await flush();
  expect(failed.client.snapshot()).toMatchObject({ phase: 'error', issue: { code: 'input' } });
  failed.client.dispose();
});
it('stops before initialization completes and removes timers/listeners on disposal', async () => {
  vi.useFakeTimers();
  const { client, ports } = setup({ prepare: () => new Promise(() => {}) });
  const listener = vi.fn();
  client.subscribe(listener);
  client.analyze(input, settings);
  client.stop();
  expect(client.snapshot()).toMatchObject({ phase: 'stopped', routes: [] });
  expect(ports[0].terminated).toBe(true);
  client.dispose();
  expect(ports[0].onmessage).toBeNull();
  expect(ports[0].onerror).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it('finishes only after the final queued replay and includes its work in coverage', async () => {
  let release: (() => void) | undefined;
  const { client, ports } = setup({
    verify: async (prepared, raw, control) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      control.budget.charge('simulate', 12);
      return validateLabRoute(context, prepared, raw, 'current');
    },
  });
  client.analyze(input, settings);
  await flush();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  ports[0].reply({
    kind: 'done',
    requestId: 1,
    reason: 'complete',
    coverage: {
      elapsedMs: 100,
      operations: 100,
      colors: {},
      crossCompletions: 1,
      f2lCompletions: 1,
      rejectedCandidates: 0,
      entryHighWater: 2,
    },
  });
  expect(client.snapshot().phase).toBe('searching');
  release!();
  await flush();
  expect(client.snapshot()).toMatchObject({
    phase: 'complete',
    coverage: { operations: 112, reason: 'complete' },
  });
  expect(client.snapshot().routes).toHaveLength(1);
  client.dispose();
});
it('records manual stop elapsed time and client work even without worker progress', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const { client } = setup({
    prepare: async (raw, control) => {
      control.budget.charge('simulate', 7);
      return prepareLabInput(context.engine, raw);
    },
  });
  client.analyze(input, settings);
  await flush();
  await vi.advanceTimersByTimeAsync(1000);
  client.stop();
  expect(client.snapshot().coverage).toMatchObject({
    elapsedMs: 1000,
    operations: 7,
    reason: 'cancelled',
  });
  client.dispose();
});
it.each(['work-limit', 'frontier-limit'] as const)(
  'records the final client %s rather than a stale worker reason',
  async (reason) => {
    const { client, ports } = setup({
      verify: async () => {
        throw new LabStopped(reason);
      },
    });
    client.analyze(input, settings);
    await flush();
    ports[0].reply({
      kind: 'progress',
      requestId: 1,
      coverage: {
        elapsedMs: 10,
        operations: 20,
        colors: {},
        crossCompletions: 1,
        f2lCompletions: 1,
        rejectedCandidates: 0,
        entryHighWater: 2,
        reason: 'complete',
      },
    });
    ports[0].reply({ kind: 'candidate', requestId: 1, route });
    await flush();
    expect(client.snapshot().coverage).toMatchObject({ operations: 20, entryHighWater: 3, reason });
    client.dispose();
  },
);
it('keeps an honest saveable receipt after background scheduling delays', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const { client, ports } = setup();
  client.analyze(input, settings);
  await flush();
  ports[0].reply({ kind: 'candidate', requestId: 1, route });
  await flush();
  vi.setSystemTime(100000);
  client.stop();
  expect(client.snapshot().coverage).toMatchObject({ elapsedMs: 99000, reason: 'cancelled' });
  expect(isLabCoverage(client.snapshot().coverage)).toBe(true);
  expect(() => createExperiment(client.snapshot(), [route.id])).not.toThrow();
  client.dispose();
});
