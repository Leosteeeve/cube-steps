import { beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { loadTestAdvancedRouxAssets } from '../../tests/helpers/roux-advanced-assets';
import type { AdvancedRouxAssets } from '../methods/roux-advanced/assets';
import { handleRouxAdvancedRequest, drainRouxAsync } from './roux-advanced-request';
import type { RouxAnalyzeRequest, RouxReply } from './roux-advanced-protocol';
import { createRouxSearchBudget } from '../methods/roux-advanced/budget';
let engine: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  engine = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
const request: RouxAnalyzeRequest = {
  kind: 'analyze',
  requestId: 1,
  edition: 'club',
  input: { kind: 'scramble', moves: [] },
  settings: { allowedFrames: ['yellow-orange'], mode: 'normal', modelVersion: 'roux-execution-v1' },
  startedAtEpochMs: 1000,
};
it('includes initialization in the original deadline without a fresh post-import budget', async () => {
  let time = 1000;
  const events: RouxReply[] = [];
  await handleRouxAdvancedRequest(request, {
    now: () => time,
    load: async () => {
      time = 9001;
      return { engine, assets };
    },
    emit: (e) => events.push(e),
  });
  expect(events.some((e) => e.kind === 'candidate')).toBe(false);
  expect(events.at(-1)).toMatchObject({
    kind: 'done',
    outcome: { ok: false, coverage: { reason: 'time-limit', elapsedMs: 8001 } },
  });
});
it('does not publish late initialization after cancellation and rejects global edition before loading', async () => {
  let cancelled = false;
  const events: RouxReply[] = [];
  await handleRouxAdvancedRequest(request, {
    now: () => 1000,
    cancelled: () => cancelled,
    load: async () => {
      cancelled = true;
      return { engine, assets };
    },
    emit: (e) => events.push(e),
  });
  expect(events.some((e) => e.kind === 'candidate')).toBe(false);
  expect(events.at(-1)).toMatchObject({
    kind: 'done',
    outcome: { ok: false, coverage: { reason: 'cancelled' } },
  });
  const load = vi.fn(async () => ({ engine, assets }));
  events.length = 0;
  await handleRouxAdvancedRequest(
    { ...request, edition: 'global' },
    { now: () => 1000, load, emit: (e) => events.push(e) },
  );
  expect(load).not.toHaveBeenCalled();
  expect(events.at(-1)?.kind).toBe('error');
});
it('yields by work count or clock and closes iterators when a pump aborts', async () => {
  const b = createRouxSearchBudget('normal', { now: () => 0 });
  let yields = 0,
    closed = false;
  function* run() {
    try {
      for (let i = 0; i < 1024; i++) {
        b.charge('score');
        yield { kind: 'work' as const };
      }
      return 42;
    } finally {
      closed = true;
    }
  }
  expect(
    await drainRouxAsync(
      run(),
      b,
      () => {},
      () => 0,
      async () => {
        yields++;
      },
    ),
  ).toBe(42);
  expect(yields).toBeGreaterThanOrEqual(4);
  expect(closed).toBe(true);
});
it('publishes a complete allowed-frame fallback before optional work', async () => {
  const events: RouxReply[] = [];
  await handleRouxAdvancedRequest(request, {
    now: () => 1000,
    load: async () => ({ engine, assets }),
    yieldTask: async () => {},
    emit: (e) => events.push(e),
  });
  const result = events.find((e) => e.kind === 'candidate');
  expect(result?.kind).toBe('candidate');
  if (result?.kind !== 'candidate') throw Error('No baseline');
  expect(result.route.frameId).toBe('yellow-orange');
  expect(engine.isSolved(result.route.trace.final)).toBe(true);
  expect(events.at(-1)).toMatchObject({ kind: 'done', outcome: { ok: true } });
});
