import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, CubeState, SolveTrace, TeachingMove } from '../../core/types';
import { checkStage } from './stages';
import { firstStages } from '../../../tests/helpers/stages';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { replayMatchesRecordedStates } from '../../../tests/helpers/trace';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const petals = (state: CubeState) =>
  engine.observe(state).edges.filter((piece) => piece.stickers.U === 'white');
function expectDaisyRoute(trace: SolveTrace) {
  const stage = trace.stages[0];
  if (stage.status === 'skipped') return;
  const states = [stage.before, ...stage.actions.map((action) => action.after)];
  const flower = states.findIndex(
    (state) => engine.observe(state).centers.U === 'yellow' && petals(state).length === 4,
  );
  expect(
    flower,
    'reach four white petals around yellow before lowering any',
  ).toBeGreaterThanOrEqual(0);
  for (const action of stage.actions.slice(0, flower)) {
    if (engine.observe(action.before).centers.U !== 'yellow') continue;
    const afterIds = petals(action.after).map((piece) => piece.id);
    for (const piece of petals(action.before)) expect(afterIds).toContain(piece.id);
  }
  const lowered = new Set<string>();
  for (const action of stage.actions.slice(flower)) {
    const before = engine.observe(action.before),
      after = engine.observe(action.after);
    expect(after.centers.U).toBe('yellow');
    const difference = petals(action.before).length - petals(action.after).length;
    if (difference) {
      expect(difference).toBe(1);
      expect(action.moves).toEqual(['F2']);
      const edge = before.edges.find((piece) => piece.slot === 'UF')!;
      expect(edge.stickers.U).toBe('white');
      expect(edge.stickers.F).toBe(before.centers.F);
      expect(action.targets).toContain(edge.id);
      lowered.add(edge.id);
    }
    for (const id of lowered) {
      const edge = after.edges.find((piece) => piece.id === id)!;
      expect(edge.stickers.D).toBe('white');
      for (const [face, color] of Object.entries(edge.stickers))
        expect(color).toBe(after.centers[face as keyof typeof after.centers]);
    }
    expect(action.checkpoint.passed).toBe(true);
  }
  expect(lowered.size).toBe(4);
  expect(engine.observe(trace.final).centers.D).toBe('white');
}
it('builds a complete daisy, then aligns and lowers each petal without disturbing finished edges', () => {
  const initial = engine.apply(engine.solved(), seededScramble(1));
  expectDaisyRoute(firstStages(engine, initial, 1));
});
it('keeps a bonus petal when moving a sideways edge into the middle layer', () => {
  const trace = firstStages(engine, engine.apply(engine.solved(), seededScramble(12)), 1);
  const extraction = trace.stages[0].actions.find(
    (action) =>
      action.ruleId === 'daisy-extract-sideways' &&
      petals(action.after).length > petals(action.before).length,
  );
  expect(extraction).toBeDefined();
  expectDaisyRoute(trace);
});
it.each<TeachingMove[]>([
  ['x2', 'F2', 'R2', 'B2', 'L2'],
  ['x2', 'F2', 'R2', 'B2', 'L2', 'U'],
  ['x2', 'F2', 'R2', 'B2'],
])('uses existing petals rather than rebuilding them (%j)', (...moves) => {
  const initial = engine.apply(engine.solved(), moves);
  const trace = firstStages(engine, initial, 1);
  expectDaisyRoute(trace);
  expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
});
it('solves the cross from all 24 locations/orientations of each white edge', () => {
  const coverage = new Map<string, Set<string>>(
    ['UF', 'UR', 'UB', 'UL'].map((id) => [id, new Set()]),
  );
  for (let seed = 1; seed <= 200; seed++) {
    const initial = engine.apply(engine.solved(), seededScramble(seed));
    for (const p of engine.observe(initial).edges)
      coverage
        .get(p.id)
        ?.add(`${p.slot}/${Object.entries(p.stickers).find(([, c]) => c === 'white')?.[0]}`);
    const trace = firstStages(engine, initial, 1);
    expectDaisyRoute(trace);
    expect(checkStage(engine, trace.final, 'white-cross'), `seed ${seed}`).toBe(true);
    expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
  }
  for (const cases of coverage.values()) expect(cases.size).toBe(24);
  expect(firstStages(engine, engine.solved(), 1).stages[0].actions).toHaveLength(0);
});
it('skips an already aligned cross in every holding orientation', () => {
  for (const up of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][])
    for (const around of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
      const initial = engine.apply(engine.solved(), [...up, ...around]);
      const trace = firstStages(engine, initial, 1);
      expect(trace.stages[0].status).toBe('skipped');
      expect(trace.stages[0].actions).toHaveLength(0);
      expect(engine.equals(trace.final, initial)).toBe(true);
    }
});
