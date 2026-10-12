import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { solveCFOP } from './solve';
import { CFOP_STAGE_IDS } from './stages';
import { flattenTrace } from '../shared/trace';
import { verifyTrace } from '../shared/verification';
import { CFOP_RUNTIME } from './definition';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
it('returns an empty complete CFOP trace for a solved input', () => {
  const result = solveCFOP(engine, engine.solved()); expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  expect(result.trace.method).toBe('cfop-beginner');
  expect(result.trace.stages.map(s => s.id)).toEqual(CFOP_STAGE_IDS);
  expect(result.trace.stages.every(s => s.status === 'skipped')).toBe(true);
  expect(flattenTrace(result.trace).moves).toEqual([]);
});
it('solves complete and partial inputs from all 24 holding frames', () => {
  const frames: TeachingMove[][] = [[]];
  for (let i = 0; i < frames.length; i++) for (const m of ['x', 'y'] as TeachingMove[]) {
    const next = [...frames[i], m];
    if (!frames.some(f => engine.equals(engine.apply(engine.solved(), f), engine.apply(engine.solved(), next)))) frames.push(next);
  }
  expect(frames).toHaveLength(24);
  for (const f of frames) for (const input of [[], ['D'], seededScramble(42)] as TeachingMove[][]) {
    const initial = engine.apply(engine.solved(), [...input, ...f]);
    const result = solveCFOP(engine, initial);
    if (!result.ok) throw new Error(`${input.join(' ')} / ${f.join(' ')}: ${result.message}`);
    expect(engine.equals(result.trace.initial, initial)).toBe(true);
    expect(() => verifyTrace(engine, result.trace, CFOP_RUNTIME)).not.toThrow();
    if (input.length <= 1) expect(result.trace.stages.slice(0, 6).every(s => s.status === 'skipped')).toBe(true);
  }
});
it('returns a structured phase failure and no partial trace on budget exhaustion', () => {
  const result = solveCFOP(engine, engine.apply(engine.solved(), ['R']), { maxActions: 0, maxMoves: 0 });
  expect(result).toMatchObject({ ok: false, code: 'budget', stageId: 'cfop-cross' });
  expect('trace' in result).toBe(false);
});
