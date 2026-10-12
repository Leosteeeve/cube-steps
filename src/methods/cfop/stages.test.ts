import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { checkCFOPStage, CFOP_STAGE_IDS } from './stages';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
it('keeps final alignment distinct from relative permutation', () => {
  const state = engine.apply(engine.solved(), ['D']);
  expect(checkCFOPStage(engine, state, 'cfop-pll-edges')).toBe(true);
  expect(checkCFOPStage(engine, state, 'cfop-auf')).toBe(false);
});
it('recognizes every solved stage in all 24 holding frames', () => {
  const states = [engine.solved()];
  for (let i = 0; i < states.length; i++) for (const move of ['x', 'y'] as TeachingMove[]) {
    const next = engine.apply(states[i], [move]);
    if (!states.some(s => engine.equals(s, next))) states.push(next);
  }
  expect(states).toHaveLength(24);
  expect(CFOP_STAGE_IDS).toHaveLength(7);
  for (const state of states) for (const stage of CFOP_STAGE_IDS) expect(checkCFOPStage(engine, state, stage), stage).toBe(true);
});
it('requires earlier layers and refuses another method stage', () => {
  const broken = engine.apply(engine.solved(), ['D', 'R']);
  expect(checkCFOPStage(engine, broken, 'cfop-oll-corners')).toBe(false);
  expect(checkCFOPStage(engine, engine.solved(), 'white-cross')).toBe(false);
});
