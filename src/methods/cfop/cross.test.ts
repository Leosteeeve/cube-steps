import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, CubeState, TeachingMove } from '../../core/types';
import { createMethodTrace } from '../shared/trace';
import { CFOP_RUNTIME } from './definition';
import { solveCFOPCross } from './cross';
import { pieceSolved, whiteCrossSolved } from '../shared/pieces';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { EDGE_SLOTS } from '../../core/observations';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
function run(initial: CubeState) {
  const trace = createMethodTrace(engine, initial, CFOP_RUNTIME), c = { engine, trace };
  trace.beginStage('cfop-cross');
  expect(solveCFOPCross(c).ok).toBe(true);
  trace.endStage();
  const stage = trace.finish().stages[0];
  for (const a of stage.actions) {
    const before = engine.observe(a.before), after = engine.observe(a.after);
    const protectedIds = before.edges.filter(p => Object.values(p.stickers).includes('white') && pieceSolved(p, before)).map(p => p.id);
    for (const id of protectedIds) expect(pieceSolved(after.edges.find(p => p.id === id)!, after), `${a.caseId}: ${id}`).toBe(true);
    expect(engine.equals(engine.apply(a.before, a.moves), a.after)).toBe(true);
    expect(CFOP_RUNTIME.checkAction(engine, a, stage.id), a.caseId).toBe(true);
    expect(a.caseId).not.toContain('daisy');
  }
  expect(whiteCrossSolved(engine, trace.current)).toBe(true);
  return stage;
}
it('skips a solved cross without changing grip', () => {
  const initial = engine.apply(engine.solved(), ['D']);
  const stage = run(initial);
  expect(stage.actions).toHaveLength(0);
  expect(stage.after).toEqual(initial);
});
it('solves every edge location and orientation while preserving all already matched edges', () => {
  for (let slot = 0; slot < 12; slot++) for (let flip = 0; flip < 2; flip++) {
    const state = structuredClone(engine.solved());
    [state.data.EDGES.pieces[0], state.data.EDGES.pieces[slot]] = [state.data.EDGES.pieces[slot], state.data.EDGES.pieces[0]];
    if (slot !== 0) [state.data.CORNERS.pieces[4], state.data.CORNERS.pieces[5]] = [5, 4];
    state.data.EDGES.orientation[slot] = flip;
    state.data.EDGES.orientation[slot === 4 ? 5 : 4] ^= flip;
    expect(run(state).checkpoint.passed, `${EDGE_SLOTS[slot]} ${flip}`).toBe(true);
  }
});
it('handles scrambles in every holding orientation and records needed regripping first', () => {
  const rotations: TeachingMove[][] = [[]];
  for (let i = 0; i < rotations.length; i++) for (const move of ['x', 'y'] as TeachingMove[]) {
    const next = [...rotations[i], move];
    if (!rotations.some(r => engine.equals(engine.apply(engine.solved(), r), engine.apply(engine.solved(), next)))) rotations.push(next);
  }
  expect(rotations).toHaveLength(24);
  for (const frame of rotations) run(engine.apply(engine.solved(), [...seededScramble(19), ...frame]));
  const stage = run(engine.apply(engine.solved(), seededScramble(8)));
  expect(stage.actions[0].kind).toBe('regrip');
  for (let seed = 1; seed <= 100; seed++) run(engine.apply(engine.solved(), seededScramble(seed)));
});
