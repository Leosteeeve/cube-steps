import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TraceStage, TeachingMove } from '../../core/types';
import { createMethodTrace } from '../shared/trace';
import { ADVANCED_RUNTIME } from './definition';
import { solveAdvancedOLL, solveAdvancedPLL, solveAdvancedAUF } from './last-layer';
import { legalPLLPermutations } from '../../../tests/fixtures/advanced-last-layer';
import { checkAdvancedStage } from './stages';
import { getCaseFixture } from '../../algorithms/fixtures';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const crossTable = { version: 1 as const, distances: new Uint8Array(0), goalIndex: 0 };
function run(state: ReturnType<CubeEngine['solved']>) {
  const trace = createMethodTrace(engine, state, ADVANCED_RUNTIME),
    context = { engine, trace, crossTable };
  for (const [id, solve] of [
    ['advanced-oll', solveAdvancedOLL],
    ['advanced-pll', solveAdvancedPLL],
    ['advanced-auf', solveAdvancedAUF],
  ] as const) {
    trace.beginStage(id);
    expect(solve(context).ok).toBe(true);
    expect(checkAdvancedStage(engine, trace.current, id)).toBe(true);
    trace.endStage();
  }
  expect(engine.isSolved(trace.current)).toBe(true);
  const stages = trace.finish().stages;
  for (const stage of stages)
    for (const action of stage.actions)
      expect(ADVANCED_RUNTIME.checkAction(engine, action, stage.id), action.ruleId).toBe(true);
  return stages;
}
it('solves_one_formula_then_auf', () => {
  const families = new Set<string>();
  for (const state of legalPLLPermutations(engine)) {
    const before = checkAdvancedStage(engine, state, 'advanced-pll'),
      stages = run(state),
      pll = stages[1];
    expect(pll.actions.filter((a) => a.kind === 'algorithm')).toHaveLength(before ? 0 : 1);
    for (const a of pll.actions) if (a.kind === 'algorithm') families.add(a.caseId);
    expect(stages[0].actions).toHaveLength(0);
  }
  expect(families.size).toBe(21);
});
it('uses_one_full_oll_and_handles_all_auf_offsets', () => {
  for (const id of ['oll-03', 'oll-20', 'oll-36', 'oll-45']) {
    const fixture = getCaseFixture(`${id}/u0`)!;
    const stages = run(fixture.initial);
    expect(stages[0].actions.filter((a) => a.kind === 'algorithm')).toHaveLength(1);
  }
  for (const u of [[], ['U'], ["U'"], ['U2']] as TeachingMove[][]) {
    const stages = run(engine.apply(engine.solved(), ['z2', ...u, 'x']));
    expect(stages.slice(0, 2).flatMap((s) => s.actions)).toHaveLength(0);
    expect(stages[2].actions.some((a) => a.kind === 'algorithm')).toBe(false);
  }
});
it('rejects_tampered_recognition_metadata', () => {
  const stage = run(getCaseFixture('oll-45/u1')!.initial)[0],
    action = stage.actions.find((a) => a.kind === 'algorithm')!;
  const wrong = structuredClone(action);
  wrong.caseId = 'oll-01';
  expect(ADVANCED_RUNTIME.checkAction(engine, wrong, stage.id)).toBe(false);
  wrong.caseId = action.caseId;
  wrong.algorithmId = 'oll-01/main';
  expect(ADVANCED_RUNTIME.checkAction(engine, wrong, stage.id)).toBe(false);
  wrong.algorithmId = action.algorithmId;
  wrong.targets = [];
  expect(ADVANCED_RUNTIME.checkAction(engine, wrong, stage.id)).toBe(false);
});
