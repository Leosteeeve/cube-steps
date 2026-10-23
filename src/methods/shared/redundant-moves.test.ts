import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, SolveTrace } from '../../core/types';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { loadTestRouxAssets } from '../../../tests/helpers/roux';
import { solveRoux } from '../roux/solve';
import { solveCFOP } from '../cfop/solve';
import { solveAdvancedCFOP } from '../advanced/solve';
import type { RouxAssets } from '../roux/assets';
let engine: CubeEngine, roux: RouxAssets;
const advanced = {
  crossTable: {
    version: 1 as const,
    goalIndex: 69760,
    distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
  },
};
beforeAll(async () => {
  engine = await createCubeEngine();
  roux = await loadTestRouxAssets();
});
function repeatedStates(trace: SolveTrace) {
  const loops: string[] = [];
  for (const stage of trace.stages) {
    let state = stage.before;
    const seen = new Map([[JSON.stringify(state.data), 0]]),
      moves: string[] = [];
    for (const action of stage.actions)
      for (const move of action.moves) {
        moves.push(move);
        state = engine.apply(state, [move]);
        const key = JSON.stringify(state.data),
          previous = seen.get(key);
        if (previous !== undefined) loops.push(`${stage.id}: ${moves.slice(previous).join(' ')}`);
        seen.set(key, moves.length);
      }
  }
  return loops;
}
it.each([
  ['roux', 1],
  ['roux', 5],
  ['cfop', 4],
  ['cfop', 8],
  ['advanced', 1],
  ['advanced', 39],
] as const)(
  '%s seed %i does not send the learner back to an already visited state',
  (name, seed) => {
    const input = engine.apply(engine.solved(), seededScramble(seed));
    const result =
      name === 'roux'
        ? solveRoux(engine, input, roux)
        : name === 'cfop'
          ? solveCFOP(engine, input)
          : solveAdvancedCFOP(engine, input, advanced);
    if (!result.ok) throw Error(result.message);
    expect(repeatedStates(result.trace)).toEqual([]);
    for (const stage of result.trace.stages) {
      for (let i = 1; i < stage.actions.length; i++) {
        const previous = stage.actions[i - 1].moves.at(-1)!.replace(/[2']/g, '');
        const next = stage.actions[i].moves[0].replace(/[2']/g, '');
        expect(previous, stage.id + ': redundant action boundary').not.toBe(next);
      }
    }
    expect(engine.isSolved(result.trace.final)).toBe(true);
  },
);
