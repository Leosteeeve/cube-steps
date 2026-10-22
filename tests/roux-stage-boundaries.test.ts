import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { solveRoux } from '../src/methods/roux/solve';
import { seededScramble } from './fixtures/lbl-cases';
import { rouxFixture } from './fixtures/roux-cases';
import { assertCompleteRouxTrace, loadTestRouxAssets } from './helpers/roux';
it('resumes legal intermediate stages and difficult physical fixtures without losing trace continuity', async () => {
  const e = await createCubeEngine(),
    assets = await loadTestRouxAssets(),
    original = solveRoux(e, e.apply(e.solved(), seededScramble(31)), assets);
  if (!original.ok) throw Error(original.message);
  const held = [
    ...original.trace.stages.map((s) => s.after),
    ...[
      'first-block-slice-assist',
      'second-block-slice-assist',
      'lse-six-bad',
      'lse-front-arrow',
      'lse-back-arrow',
    ].map((id) => rouxFixture(e, id)),
  ];
  for (const state of held) {
    const initial = e.apply(state, ["y'", 'x2']),
      r = solveRoux(e, initial, assets);
    if (!r.ok) throw Error(`${r.stageId}: ${r.message}`);
    assertCompleteRouxTrace(e, initial, r.trace);
  }
  const solved = solveRoux(e, e.solved(), assets);
  if (!solved.ok) throw Error(solved.message);
  expect(solved.trace.stages.filter((s) => s.status === 'skipped')).toHaveLength(7);
});
