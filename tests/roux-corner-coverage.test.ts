import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { rouxReferenceState } from '../src/methods/roux/frame';
import { createRouxBudget } from '../src/methods/roux/budget';
import { blockComplete, cornerOffset } from '../src/methods/roux/predicates';
import { planCornerOrientation, planCornerPermutation } from '../src/methods/roux/corners/plan';
import { assertRouxActions } from './helpers/roux';
function permutations(a: number[]): number[][] {
  return a.length
    ? a.flatMap((v, i) => permutations(a.filter((_, j) => j !== i)).map((p) => [v, ...p]))
    : [[]];
}
const parity = (a: number[]) =>
  a.reduce((n, v, i) => n + a.slice(i + 1).filter((w) => w < v).length, 0) % 2;
it('solves all 648 legal corner cases in four center phases and four legal edge orientations', async () => {
  const engine = await createCubeEngine(),
    seen = new Set<string>();
  let count = 0;
  for (const p of permutations([0, 1, 2, 3]))
    for (let code = 0; code < 27; code++)
      for (let phase = 0; phase < 4; phase++)
        for (const mask of [0, 3, 5, 15]) {
          const state = structuredClone(
              engine.apply(rouxReferenceState(engine), Array(phase).fill('M')),
            ),
            c = state.data.CORNERS,
            e = state.data.EDGES;
          const ids = c.pieces.slice(0, 4),
            ori = c.orientation.slice(0, 4),
            twists = [code % 3, Math.floor(code / 3) % 3, Math.floor(code / 9)];
          twists.push((6 - twists.reduce((a, b) => a + b, 0)) % 3);
          for (let i = 0; i < 4; i++) {
            c.pieces[i] = ids[p[i]];
            c.orientation[i] = (ori[p[i]] + twists[i]) % 3;
            e.orientation[i] ^= (mask >> i) & 1;
          }
          if (parity(p)) [e.pieces[0], e.pieces[1]] = [e.pieces[1], e.pieces[0]];
          const co = planCornerOrientation(engine, state, createRouxBudget());
          assertRouxActions(engine, state, co);
          if (!co.ok) throw Error(co.message);
          const cp = planCornerPermutation(engine, co.state, createRouxBudget());
          assertRouxActions(engine, co.state, cp);
          if (!cp.ok) throw Error(cp.message);
          expect(co.actions.filter((a) => a.kind === 'algorithm').length).toBeLessThanOrEqual(1);
          expect(cp.actions.filter((a) => a.kind === 'algorithm').length).toBeLessThanOrEqual(1);
          expect(cornerOffset(engine, cp.state)).toBe(0);
          expect(
            blockComplete(engine, cp.state, 'left') && blockComplete(engine, cp.state, 'right'),
          ).toBe(true);
          for (const a of [...co.actions, ...cp.actions])
            if (a.algorithmId) seen.add(a.algorithmId);
          count++;
        }
  expect(count).toBe(648 * 4 * 4);
  expect([...seen].sort()).toEqual(
    [...Array.from({ length: 7 }, (_, i) => `roux-ocll-${i + 21}`), 'roux-t', 'roux-y'].sort(),
  );
}, 120000);
