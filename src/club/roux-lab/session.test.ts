import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { prepareRouxInput } from '../../methods/roux-advanced/input';
import type { RouxRoute } from '../../roux-lab/types';
import type { RouxInput } from '../../methods/roux-advanced/types';
import { initialRouxLabSession, reduceRouxLabSession } from './session';
let input: RouxInput;
beforeAll(async () => {
  input = prepareRouxInput(await createCubeEngine(), { kind: 'scramble', moves: ['F'] });
});
// These represent already-admitted client events. Physical route admission has its own corpus.
const route = (id: string, cost: number): RouxRoute =>
  ({
    id,
    input,
    frameId: 'white-blue',
    basis: 'baseline-fallback',
    evidence: { status: 'not-explored' },
    counts: { first: 1, second: 2, combined: 3, rotations: 0 },
    score: { rated: true, cost, T: 3, R: 0, G: 0, V: 0, A: 0 },
  }) as RouxRoute;
it('retains the selected snapshot as progress and better routes arrive', () => {
  let s = reduceRouxLabSession(initialRouxLabSession(), { type: 'start', input });
  const a = route('a', 20),
    b = route('b', 10);
  s = reduceRouxLabSession(s, { kind: 'candidate', route: a });
  expect(s.selectedId).toBe('a');
  s = reduceRouxLabSession(s, { kind: 'candidate', route: b });
  expect(s.selectedId).toBe('a');
  expect(s.routes.find((r) => r.id === 'a')).toBe(a);
  s = reduceRouxLabSession(s, {
    kind: 'candidate',
    route: {
      ...a,
      evidence: {
        status: 'proven-minimum',
        minimum: 1,
        witness: ['F'],
        proof: {
          coordinateVersion: 1,
          moveSetVersion: 'roux-stm-v1',
          completedDepth: 0,
          assetDigest: 'x',
        },
      },
    },
  });
  expect(s.routes.find((r) => r.id === 'a')).toBe(a);
  s = reduceRouxLabSession(s, { type: 'failed', error: 'Deadline reached' });
  expect(s.routes).toHaveLength(2);
  expect(s.error).toBe('Deadline reached');
});
it('rejects foreign inputs/frames and preserves exact coverage without invented proof', () => {
  let s = reduceRouxLabSession(initialRouxLabSession(['white-blue']), { type: 'start', input });
  expect(
    reduceRouxLabSession(s, {
      kind: 'candidate',
      route: { ...route('x', 2), frameId: 'yellow-red' },
    }),
  ).toBe(s);
  expect(
    reduceRouxLabSession(s, {
      kind: 'candidate',
      route: { ...route('x', 2), input: { ...input, fingerprint: 'foreign' } },
    }),
  ).toBe(s);
  const coverage = {
    elapsedMs: 22,
    operations: 300,
    entries: 4,
    retainedBytes: 500,
    verifiedRoutes: 0,
    frames: { 'white-blue': { status: 'not-explored' as const } },
  };
  s = reduceRouxLabSession(s, { kind: 'progress', coverage });
  expect(s.coverage).toBe(coverage);
  expect(s.routes).toHaveLength(0);
  expect(() => initialRouxLabSession([])).toThrow();
});
it('reconciles tighter evidence while preserving the selected reference and baseline', () => {
  let s = reduceRouxLabSession(initialRouxLabSession(['white-blue']), { type: 'start', input });
  const loose = {
    status: 'best-found' as const,
    lowerBound: 2,
    upperBound: 5,
    witness: ['F'] as const,
    completedDepth: 1,
  };
  const baseline = { ...route('baseline', 30), evidence: loose };
  const optimized = {
    ...route('optimized', 5),
    basis: 'optimized' as const,
    evidence: loose,
    counts: { first: 5, second: 1, combined: 6, rotations: 0 },
  };
  s = reduceRouxLabSession(s, { kind: 'candidate', route: baseline });
  s = reduceRouxLabSession(s, { kind: 'candidate', route: optimized });
  s = reduceRouxLabSession(s, { type: 'select', id: optimized.id });
  const coverage = {
    elapsedMs: 20,
    operations: 100,
    entries: 0,
    retainedBytes: 0,
    verifiedRoutes: 2,
    frames: {
      'white-blue': {
        status: 'best-found' as const,
        lowerBound: 2,
        upperBound: 2,
        witness: ['F', 'U'] as const,
        completedDepth: 1,
      },
    },
  };
  s = reduceRouxLabSession(s, { kind: 'progress', coverage });
  expect(s.routes[0]).toBe(baseline);
  expect(s.selectedId).toBe(optimized.id);
  expect(s.routes.find((r) => r.id === optimized.id)).toBe(optimized);
  s = reduceRouxLabSession(s, { type: 'complete', coverage });
  expect(s.routes[0]).toBe(baseline);
  expect(s.routes).toContain(optimized);
});
