import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { ROUX_FRAMES } from '../src/methods/roux-advanced/frames';
import { recognizeCmll } from '../src/methods/roux-advanced/cmll/recognize';
import { planCmllVariants } from '../src/methods/roux-advanced/cmll/plan';
import { CMLL_CATALOG } from '../src/methods/roux-advanced/cmll/catalog';
import { createRouxSearchBudget } from '../src/methods/roux-advanced/budget';
import { observeAdvancedFrame } from '../src/methods/roux-advanced/predicates';
function permutations(a: number[]): number[][] {
  return a.length
    ? a.flatMap((v, i) => permutations(a.filter((_, j) => i !== j)).map((p) => [v, ...p]))
    : [[]];
}
const parity = (p: number[]) =>
  p.reduce((n, x, i) => n + p.slice(i + 1).filter((y) => y < x).length, 0) % 2;
it('covers the independent 24 × 27 corner domain with legal unrelated edge flips and permutations', async () => {
  const e = await createCubeEngine(),
    frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!,
    seen = new Set<string>();
  let checked = 0;
  for (const permutation of permutations([0, 1, 2, 3]))
    for (let code = 0; code < 27; code++) {
      const state = structuredClone(e.apply(e.solved(), [...frame.positioningMoves, 'M', 'U2']));
      const corners = state.data.CORNERS,
        edges = state.data.EDGES,
        ids = corners.pieces.slice(0, 4),
        ori = corners.orientation.slice(0, 4),
        twists = [code % 3, Math.floor(code / 3) % 3, Math.floor(code / 9)];
      twists.push((6 - twists.reduce((a, b) => a + b, 0)) % 3);
      for (let i = 0; i < 4; i++) {
        corners.pieces[i] = ids[permutation[i]];
        corners.orientation[i] = (ori[permutation[i]] + twists[i]) % 3;
      }
      if (parity(permutation))
        [edges.pieces[0], edges.pieces[1]] = [edges.pieces[1], edges.pieces[0]];
      edges.orientation[0] ^= 1;
      edges.orientation[2] ^= 1;
      seen.add(recognizeCmll(e, state, frame).caseId);
      const options = planCmllVariants(
        e,
        state,
        frame,
        CMLL_CATALOG,
        createRouxSearchBudget('lab', { now: () => 0 }),
      );
      expect(options.length).toBeGreaterThan(0);
      expect(observeAdvancedFrame(e, options[0].state, frame).cornerOffset).not.toBeNull();
      checked++;
    }
  expect(checked).toBe(648);
  expect(seen.size).toBe(43);
}, 120000);
