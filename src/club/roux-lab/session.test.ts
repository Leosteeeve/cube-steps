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
