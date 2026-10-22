import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { solveRoux } from './solve';
import type { RouxAssets } from './assets';
import { loadTestRouxAssets } from '../../../tests/helpers/roux';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { verifyTrace } from '../shared/verification';
import { ROUX_RUNTIME } from './definition';
import { ROUX_STAGE_IDS } from './stages';
import { rouxSolved } from './predicates';
let e: CubeEngine, assets: RouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestRouxAssets();
});
it('produces eight verified stages from 20 actual scrambles without changing the input', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const initial = e.apply(e.solved(), seededScramble(seed)),
      copy = structuredClone(initial),
      r = solveRoux(e, initial, assets);
    if (!r.ok) throw Error(`seed ${seed}: ${r.stageId}: ${r.message}`);
    expect(r.trace.stages.map((s) => s.id)).toEqual(ROUX_STAGE_IDS);
    expect(r.trace.stages[0].actions[0].moves).toEqual(['x2', 'y']);
    expect(() => verifyTrace(e, r.trace, ROUX_RUNTIME)).not.toThrow();
    expect(rouxSolved(e, r.trace.final)).toBe(true);
    expect(r.trace.stages.flatMap((s) => s.actions).length).toBeLessThanOrEqual(160);
    expect(
      r.trace.stages.flatMap((s) => s.actions.flatMap((a) => a.moves)).length,
    ).toBeLessThanOrEqual(400);
    expect(initial).toEqual(copy);
  }
});
it('positions a solved cube and explains every skipped solving stage', () => {
  const r = solveRoux(e, e.solved(), assets);
  if (!r.ok) throw Error(r.message);
  expect(r.trace.stages.slice(1).every((s) => s.status === 'skipped' && s.skipReason)).toBe(true);
});
it('includes final checkpoint and replay time in the worker deadline',()=>{
 let time=0;
 const watched:CubeEngine={...e,isSolved(state){time=15000;return e.isSolved(state);}};
 expect(solveRoux(watched,watched.solved(),assets,{},()=>time)).toMatchObject({ok:false,code:'budget',stageId:'roux-last-four-edges'});
});
it('returns honest failures for the separate node, time, action and move limits', () => {
  const input = e.apply(e.solved(), seededScramble(42));
  for (const limits of [{ maxNodes: 0 }, { maxMs: 0 }, { maxActions: 0 }, { maxMoves: 1 }]) {
    const r = solveRoux(e, input, assets, limits);
    expect(r).toMatchObject({ ok: false, code: 'budget' });
    expect('trace' in r).toBe(false);
  }
});
