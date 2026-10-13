import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { createMethodTrace } from '../../shared/trace';
import type { MethodRuntime } from '../../contracts';
import { ALGORITHM_REGISTRY } from '../../../algorithms/registry';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { firstTwoLayersSolved } from '../../shared/pieces';
import { solveAdvancedF2L } from './solve';
import { generateCrossTable } from '../cross/generate';
import { planShortestCross } from '../cross/solve';
import { seededScramble } from '../../../../tests/fixtures/lbl-cases';
let engine: CubeEngine;
const table = generateCrossTable();
beforeAll(async () => {
  engine = await createCubeEngine();
});
const runtime: MethodRuntime = {
  presentation: {
    id: 'cfop-advanced',
    label: 'Advanced CFOP',
    teachingStatus: 'preview',
    stages: [{ id: 'advanced-f2l', label: 'F2L', group: 'F2L' }],
    algorithms: { ...ALGORITHM_REGISTRY.variants, ...ALGORITHM_REGISTRY.preparations },
  },
  checkStage: firstTwoLayersSolved,
  checkAction: () => true,
};
it('restores_cross_and_prior_pairs', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const scrambled = engine.apply(engine.solved(), seededScramble(seed)),
      cross = planShortestCross(engine, scrambled, table);
    const state = engine.apply(scrambled, [
      ...cross.holdingMoves,
      ...cross.moves,
      ...((seed % 2 ? ['x'] : []) as TeachingMove[]),
    ]);
    const trace = createMethodTrace(engine, state, runtime);
    trace.beginStage('advanced-f2l');
    expect(solveAdvancedF2L({ engine, trace, crossTable: table }).ok).toBe(true);
    expect(firstTwoLayersSolved(engine, trace.current)).toBe(true);
    trace.endStage();
    const stage = trace.finish().stages[0];
    for (const action of stage.actions) {
      expect(preservesF2L(engine, action.before, action.after)).toBe(true);
      if (action.kind === 'regrip') continue;
      expect(action.pair?.cornerId).toBe(action.targets[0]);
      expect(action.pair?.edgeId).toBe(action.targets[1]);
      if (action.pair?.phase === 'insert') {
        expect(action.pair.solvedAfter).toBeGreaterThan(action.pair.solvedBefore);
        expect(
          observeF2LPairs(engine, action.after).find((p) => p.cornerId === action.pair!.cornerId)
            ?.solved,
        ).toBe(true);
        expect(action.selection?.policyVersion).toBe('f2l-v1');
      }
    }
  }
}, 120000);
it('skips_solved_pairs_and_retains_whole_trace_budgets', () => {
  const trace = createMethodTrace(engine, engine.solved(), runtime);
  trace.beginStage('advanced-f2l');
  solveAdvancedF2L({ engine, trace, crossTable: table });
  trace.endStage();
  expect(trace.finish().stages[0].status).toBe('skipped');
  const state = engine.apply(engine.solved(), ['z2', 'R', 'U', "R'"]);
  const limited = createMethodTrace(engine, state, runtime, { maxActions: 0, maxMoves: 0 });
  limited.beginStage('advanced-f2l');
  expect(() => solveAdvancedF2L({ engine, trace: limited, crossTable: table })).toThrow(/budget/i);
});
