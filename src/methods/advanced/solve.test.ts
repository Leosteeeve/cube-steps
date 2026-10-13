import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { solveAdvancedCFOP } from './solve';
import { ADVANCED_STAGE_IDS } from './stages';
import { flattenTrace } from '../shared/trace';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { handleSolveRequest } from '../../workers/solve-request';
import { getMethod } from '../registry';
import { createAdvancedRuntime } from './definition';
import { verifyTrace } from '../shared/verification';
let engine: CubeEngine;
const assets = {
  crossTable: {
    version: 1 as const,
    goalIndex: 69760,
    distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
  },
};
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('returns_five_verified_stages', () => {
  expect(getMethod('cfop-advanced').stages.map((s) => s.id)).toEqual(ADVANCED_STAGE_IDS);
  for (let seed = 1; seed <= 20; seed++) {
    const initial = engine.apply(engine.solved(), seededScramble(seed)),
      copy = structuredClone(initial),
      r = solveAdvancedCFOP(engine, initial, assets);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) throw new Error(r.message);
    expect(r.trace.method).toBe('cfop-advanced');
    expect(r.trace.stages.map((s) => s.id)).toEqual(ADVANCED_STAGE_IDS);
    expect(engine.isSolved(r.trace.final)).toBe(true);
    expect(initial).toEqual(copy);
    expect(solveAdvancedCFOP(engine, initial, assets)).toEqual(r);
  }
}, 120000);
it('skips_solved_inputs_in_all_24_frames', () => {
  for (const tilt of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][])
    for (const spin of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
      const initial = engine.apply(engine.solved(), [...tilt, ...spin]),
        r = solveAdvancedCFOP(engine, initial, assets);
      expect(r.ok).toBe(true);
      if (!r.ok) throw new Error(r.message);
      expect(r.trace.stages.every((s) => s.status === 'skipped')).toBe(true);
      expect(flattenTrace(r.trace).moves).toEqual([]);
    }
});
it('rejects_wrong_method_or_missing_assets', () => {
  expect(
    handleSolveRequest(engine, {
      requestId: 1,
      method: 'cfop-advanced',
      input: { kind: 'scramble', moves: [] },
    }),
  ).toMatchObject({
    result: { ok: false, error: { kind: 'solver', message: expect.stringMatching(/asset/i) } },
  });
  expect(
    handleSolveRequest(
      engine,
      { requestId: 1, method: 'cfop-unknown', input: { kind: 'scramble', moves: [] } },
      assets,
    ),
  ).toMatchObject({ result: { ok: false, error: { kind: 'input' } } });
  expect(
    solveAdvancedCFOP(engine, engine.apply(engine.solved(), ['R']), assets, {
      maxActions: 1,
      maxMoves: 1,
    }),
  ).toMatchObject({ ok: false, code: 'budget' });
});
it('independently_rejects_forged_cross_distances_and_targets', () => {
  const r = solveAdvancedCFOP(engine, engine.apply(engine.solved(), seededScramble(9)), assets);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.message);
  const runtime = createAdvancedRuntime(assets.crossTable),
    trace = structuredClone(r.trace),
    a = trace.stages[0].actions.find((a) => a.cross)!;
  expect(() => verifyTrace(engine, trace, runtime)).not.toThrow();
  a.cross!.distanceBefore++;
  a.cross!.distanceAfter++;
  expect(() => verifyTrace(engine, trace, runtime)).toThrow(/precondition|effect/i);
  a.cross!.distanceBefore--;
  a.cross!.distanceAfter--;
  a.targets = [];
  expect(() => verifyTrace(engine, trace, runtime)).toThrow(/precondition|effect/i);
});
