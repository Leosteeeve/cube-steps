import { beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, CubeState, TraceStage } from '../../core/types';
import { createMethodTrace } from '../shared/trace';
import { CFOP_RUNTIME } from './definition';
import { solveCFOPF2L } from './f2l';
import { observeF2LPairs } from './f2l-cases';
import { pieceSolved, whiteCrossSolved } from '../shared/pieces';
import { upperPairFixtures } from '../../../tests/fixtures/cfop-cases';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { solveCFOPCross } from './cross';
import { stateToFacelets, validateFacelets } from '../../core/facelets';
import * as cases from './f2l-cases';
import { CFOP_ALGORITHMS } from './catalog';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
function check(stage: TraceStage) {
  for (const a of stage.actions) {
    expect(whiteCrossSolved(engine, a.after)).toBe(true);
    const before = engine.observe(a.before), after = engine.observe(a.after);
    for (const pair of observeF2LPairs(engine, a.before).filter(p => p.solved)) for (const id of [pair.cornerId, pair.edgeId]) {
      const piece = [...after.corners, ...after.edges].find(p => p.id === id)!;
      expect(pieceSolved(piece, after), `${a.caseId} ${id}`).toBe(true);
    }
    if (a.ruleId === 'cfop-hold-white-down') continue;
    expect(a.targets).toEqual([a.pair!.cornerId, a.pair!.edgeId]);
    expect(a.pair!.solvedBefore).toBe(observeF2LPairs(engine, a.before).filter(p => p.solved).length);
    expect(a.pair!.solvedAfter).toBe(observeF2LPairs(engine, a.after).filter(p => p.solved).length);
    if (a.pair?.phase === 'insert') {
      const c = before.corners.find(p => p.id === a.pair!.cornerId)!, e = before.edges.find(p => p.id === a.pair!.edgeId)!;
      expect(c.slot).toContain('U'); expect(e.slot).toContain('U');
      for (const face of [...e.slot]) expect(c.stickers[face as 'U']).toBe(e.stickers[face as 'U']);
      expect(a.pair.solvedAfter).toBeGreaterThan(a.pair.solvedBefore);
    }
    expect(CFOP_RUNTIME.checkAction(engine, a, stage.id), JSON.stringify(a)).toBe(true);
  }
}
function run(initial: CubeState) {
  const trace = createMethodTrace(engine, initial, CFOP_RUNTIME);
  trace.beginStage('cfop-f2l');
  expect(solveCFOPF2L({ engine, trace }).ok).toBe(true);
  expect(observeF2LPairs(engine, trace.current).filter(p => p.solved)).toHaveLength(4);
  trace.endStage(); const stage = trace.finish().stages[0]; check(stage); return stage;
}
it('solves all 96 upper-layer pair combinations with the other three slots protected', () => {
  const fixtures = upperPairFixtures(engine); expect(fixtures).toHaveLength(96);
  const families = new Set<string>(), hands = new Set<string>();
  for (const fixture of fixtures) {
    expect(validateFacelets(stateToFacelets(engine.apply(fixture, ['x2'])), engine.solved()).ok).toBe(true);
    for (const a of run(fixture).actions) { families.add(a.caseId); if (a.pair?.phase === 'insert') hands.add(a.algorithmId!); }
  }
  for (const id of ['f2l-connected', 'f2l-matching', 'f2l-opposite', 'f2l-white-up']) expect(families.has(id), id).toBe(true);
  expect(hands.size).toBe(2);
});
it('pairs a solved corner with its trapped edge without losing protected pairs', () => {
  const state = structuredClone(engine.apply(engine.solved(), ['x2']));
  const e = state.data.EDGES;
  [e.pieces[8], e.pieces[10]] = [e.pieces[10], e.pieces[8]];
  [e.pieces[0], e.pieces[1]] = [e.pieces[1], e.pieces[0]];
  expect(run(state).actions.some(a => a.caseId === 'f2l-trapped')).toBe(true);
});
it('handles all slots and protection counts after real direct crosses', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const trace = createMethodTrace(engine, engine.apply(engine.solved(), seededScramble(seed)), CFOP_RUNTIME);
    trace.beginStage('cfop-cross'); solveCFOPCross({ engine, trace }); trace.endStage();
    run(trace.current);
  }
});
it('skips solved F2L and rejects an exhausted action budget', () => {
  expect(run(engine.solved()).actions).toHaveLength(0);
  const trace = createMethodTrace(engine, upperPairFixtures(engine)[0], CFOP_RUNTIME, { maxActions: 0, maxMoves: 0 });
  trace.beginStage('cfop-f2l');
  expect(() => solveCFOPF2L({ engine, trace })).toThrow('budget');
});
it('stops a repeating rule and a 32-maneuver normalization runaway', () => {
  const initial = upperPairFixtures(engine)[0];
  const runFault = (repeat: boolean) => {
    const trace = createMethodTrace(engine, initial, CFOP_RUNTIME);
    trace.beginStage('cfop-f2l');
    const visited = new Set([JSON.stringify(initial.data)]);
    const spy = vi.spyOn(cases, 'recognizeF2L').mockImplementation((_engine, state, pair) => {
      const algorithmId = repeat ? 'f2l-right-away' : Object.keys(CFOP_ALGORITHMS).filter(id => id.startsWith('f2l-')).find(id => {
        const next = engine.apply(state, CFOP_ALGORITHMS[id].moves);
        return !visited.has(JSON.stringify(next.data)) && !observeF2LPairs(engine, next).find(p => p.cornerId === pair.cornerId)!.solved;
      })!;
      visited.add(JSON.stringify(engine.apply(state, CFOP_ALGORITHMS[algorithmId].moves).data));
      return { caseId: 'injected-runaway', phase: 'prepare', setup: [], algorithmId, recognition: 'Deliberately faulty rule for bounded-failure testing.' };
    });
    try { expect(() => solveCFOPF2L({ engine, trace })).toThrow(repeat ? 'repeated without progress' : '32 maneuvers'); }
    finally { spy.mockRestore(); }
  };
  runFault(true); runFault(false);
});
it('rejects fabricated pair progress and insertion claims', () => {
  const stage = run(upperPairFixtures(engine)[0]);
  const action = stage.actions.find(a => a.kind === 'algorithm')!;
  const wrong = structuredClone(action);
  wrong.pair!.solvedBefore = 0;
  expect(CFOP_RUNTIME.checkAction(engine, wrong, stage.id)).toBe(false);
  wrong.pair = { ...action.pair!, phase: 'insert' };
  expect(CFOP_RUNTIME.checkAction(engine, wrong, stage.id)).toBe(false);
});
