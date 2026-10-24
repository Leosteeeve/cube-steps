import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { loadTestAdvancedRouxAssets } from '../../tests/helpers/roux-advanced-assets';
import type { AdvancedRouxAssets } from '../methods/roux-advanced/assets';
import { ROUX_FRAMES } from '../methods/roux-advanced/frames';
import { prepareRouxInput } from '../methods/roux-advanced/input';
import { planBaselineBlocks } from '../methods/roux-advanced/blocks/baseline';
import { completeRouxCandidate } from '../methods/roux-advanced/complete';
import { createRouxSearchBudget } from '../methods/roux-advanced/budget';
import { createRouxSearchClient } from './client';
import type { RouxRoute } from './types';
import type { RouxWorkerPort, RouxRequest } from '../workers/roux-advanced-protocol';
let e: CubeEngine, assets: AdvancedRouxAssets, route: RouxRoute;
const settings = {
    allowedFrames: ['white-blue'] as const,
    mode: 'normal' as const,
    modelVersion: 'roux-execution-v1' as const,
  },
  source = { kind: 'scramble' as const, moves: [] };
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
  const f = ROUX_FRAMES.find((f) => f.id === 'white-blue')!,
    input = prepareRouxInput(e, source),
    b = createRouxSearchBudget('normal', { now: () => 0 });
  const g = planBaselineBlocks(e, input, f, assets.beginner, b);
  let next = g.next();
  while (!next.done) next = g.next();
  route = completeRouxCandidate(e, input, f, next.value, assets, b);
});
afterEach(() => vi.useRealTimers());
class Port implements RouxWorkerPort {
  onmessage: RouxWorkerPort['onmessage'] = null;
  onerror: RouxWorkerPort['onerror'] = null;
  sent: RouxRequest[] = [];
  terminated = false;
  postMessage(m: RouxRequest) {
    this.sent.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  reply(m: unknown) {
    this.onmessage?.({ data: m } as MessageEvent);
  }
}
const flush = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};
it('stops a burst producer at the queue bound and finishes independent admission of its baseline', async () => {
  const p = new Port(),
    events: RouxRoute[] = [];
  const client = createRouxSearchClient(e, {
    workerFactory: () => p,
    now: () => 1000,
    loadAssets: async () => assets,
    yieldTask: async () => {},
  });
  const work = client.start(source, settings, (event) => {
    if (event.kind === 'candidate') events.push(event.route);
  });
  await flush();
  const requestId = p.sent[0].requestId;
  // Physically identical snapshots with distinct producer build labels arrive
  // before independent admission gets its next task. None may be shown unchecked.
  for (let i = 0; i < 12; i++) {
    const candidate = structuredClone(route);
    candidate.versions.app = `admission-burst-fixture-${i}`;
    p.reply({ kind: 'candidate', requestId, route: candidate });
  }
  expect(events).toHaveLength(0);
  const result = await work.done;
  expect(result.ok, JSON.stringify(result)).toBe(true);
  expect(result.coverage.reason).toBe('frontier-limit');
  expect(result.coverage.verifiedRoutes).toBe(9); // one active plus eight queued
  expect(events).toHaveLength(9);
  expect(events.every(Object.isFrozen)).toBe(true);
  expect(p.terminated).toBe(true);
  client.dispose();
});
it('exposes only independently verified immutable routes and retains the incumbent when stopped', async () => {
  const p = new Port(),
    events: unknown[] = [];
  const client = createRouxSearchClient(e, {
    workerFactory: () => p,
    now: () => 1000,
    loadAssets: async () => assets,
    yieldTask: async () => {},
  });
  const work = client.start(source, settings, (x) => events.push(x));
  await flush();
  const request = p.sent[0];
  p.reply({ kind: 'candidate', requestId: request.requestId, route });
  await flush();
  work.stop();
  const result = await work.done;
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw Error(result.message);
  expect(result.coverage.reason).toBe('cancelled');
  expect(result.routes).toHaveLength(1);
  expect(Object.isFrozen(result.routes[0])).toBe(true);
  const pinned = JSON.stringify(result.routes[0]);
  p.reply({ kind: 'candidate', requestId: request.requestId, route: { ...route, id: 'changed' } });
  expect(JSON.stringify(result.routes[0])).toBe(pinned);
  expect(p.terminated).toBe(true);
  client.dispose();
});
it('rejects stale identifiers, different inputs, forbidden frames and malformed successes', async () => {
  for (const change of [
    (r: RouxRoute) => ({ ...r, input: { ...r.input, fingerprint: 'other' } }),
    (r: RouxRoute) => ({ ...r, frameId: 'yellow-orange' }),
    (r: RouxRoute) => ({ ...r, counts: { ...r.counts, first: 99 } }),
  ]) {
    const p = new Port(),
      client = createRouxSearchClient(e, {
        workerFactory: () => p,
        now: () => 1000,
        loadAssets: async () => assets,
        yieldTask: async () => {},
      }),
      seen: unknown[] = [];
    const work = client.start(source, settings, (x) => seen.push(x));
    await flush();
    const id = p.sent[0].requestId;
    p.reply({ kind: 'candidate', requestId: id + 1, route });
    p.reply({ kind: 'candidate', requestId: id, route: change(structuredClone(route)) });
    await flush();
    work.stop();
    expect((await work.done).ok).toBe(false);
    expect(seen.some((x) => (x as { kind: string }).kind === 'candidate')).toBe(false);
    client.dispose();
  }
});
it('bounds loading and stuck workers by the original request time', async () => {
  vi.useFakeTimers();
  let time = 1000;
  const p = new Port();
  const client = createRouxSearchClient(e, {
    workerFactory: () => p,
    now: () => time,
    loadAssets: () => new Promise(() => {}),
  });
  const work = client.start(source, settings, () => {}, { startedAtEpochMs: 0 });
  time = 8000;
  await vi.advanceTimersByTimeAsync(7000);
  const result = await work.done;
  expect(result.ok).toBe(false);
  expect(result.coverage.reason).toBe('time-limit');
  expect(p.sent).toHaveLength(0);
  client.dispose();
});
it('ignores a late asset promise after cancellation or replacement', async () => {
  let finish!: (a: AdvancedRouxAssets) => void;
  const p = new Port(),
    client = createRouxSearchClient(e, {
      workerFactory: () => p,
      now: () => 1000,
      loadAssets: () =>
        new Promise((r) => {
          finish = r;
        }),
    });
  const work = client.start(source, settings, () => {});
  await flush();
  work.stop();
  finish(assets);
  await flush();
  expect((await work.done).ok).toBe(false);
  expect(p.sent).toHaveLength(0);
  client.dispose();
});
it('finishes a done receipt only after independently checking its queued route', async () => {
  const p = new Port(),
    client = createRouxSearchClient(e, {
      workerFactory: () => p,
      now: () => 1000,
      loadAssets: async () => assets,
      yieldTask: async () => {},
    }),
    events: unknown[] = [];
  const work = client.start(source, settings, (x) => events.push(x));
  await flush();
  p.reply({
    kind: 'done',
    requestId: p.sent[0].requestId,
    outcome: {
      ok: true,
      routes: [route],
      coverage: {
        elapsedMs: 0,
        operations: 1,
        entries: 0,
        retainedBytes: 0,
        frames: { 'white-blue': route.evidence },
        verifiedRoutes: 1,
        reason: 'complete',
      },
    },
  });
  const result = await work.done;
  expect(result.ok).toBe(true);
  expect(events.some((x) => (x as { kind: string }).kind === 'candidate')).toBe(true);
  expect(p.terminated).toBe(true);
  client.dispose();
});
it('terminates a stuck worker at the original deadline while keeping a verified incumbent', async () => {
  vi.useFakeTimers();
  let time = 1000;
  const p = new Port(),
    client = createRouxSearchClient(e, {
      workerFactory: () => p,
      now: () => time,
      loadAssets: async () => assets,
      yieldTask: async () => {},
    }),
    work = client.start(source, settings, () => {});
  await flush();
  p.reply({ kind: 'candidate', requestId: p.sent[0].requestId, route });
  await flush();
  time = 9000;
  await vi.advanceTimersByTimeAsync(8000);
  const result = await work.done;
  expect(result.ok).toBe(true);
  expect(result.coverage.reason).toBe('time-limit');
  expect(p.terminated).toBe(true);
  client.dispose();
});
