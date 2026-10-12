import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { parseScramble } from '../core/notation';
import { stateToFacelets, validateFacelets } from '../core/facelets';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_STAGE_IDS } from '../methods/cfop/stages';
import { LAST_LAYER_CASES } from '../methods/cfop/catalog';
import { getMethod } from '../methods/registry';
import { CFOP_COURSE } from './cfop-course';
import { CFOP_EXAMPLES, CFOP_GUIDED_SCRAMBLE } from './cfop-examples';
import { replayMatchesRecordedStates } from '../../tests/helpers/trace';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('defines a complete original course with method-scoped formulas and all required case families', () => {
  expect(CFOP_COURSE.map((l) => l.id)).toEqual(['intro', ...CFOP_STAGE_IDS]);
  for (const lesson of CFOP_COURSE) {
    for (const id of lesson.algorithmIds)
      expect(getMethod('cfop-beginner').algorithms[id], id).toBeDefined();
    if (lesson.stageId) expect(CFOP_STAGE_IDS).toContain(lesson.stageId);
    for (const field of ['goal', 'observe', 'prepare', 'check', 'tip'] as const)
      expect(lesson[field].length).toBeGreaterThan(20);
  }
  const ids = CFOP_EXAMPLES.map((e) => e.expectedCaseId);
  for (const id of [
    'f2l-connected',
    'f2l-matching',
    'f2l-opposite',
    'f2l-white-up',
    'f2l-trapped',
    ...LAST_LAYER_CASES.map((c) => c.id),
  ])
    expect(ids).toContain(id);
  expect(CFOP_COURSE.find((l) => l.id === 'cfop-auf')?.prepare).toContain('adjust the upper face');
  expect(CFOP_COURSE.map((l) => l.tip).join(' ')).toMatch(/already|skip/i);
});
it('follows one guided solve with real work in all four main phases and each last-layer look', () => {
  const parsed = parseScramble(CFOP_GUIDED_SCRAMBLE);
  if (!parsed.ok) throw new Error(parsed.message);
  const result = solveCFOP(engine, engine.apply(engine.solved(), parsed.moves));
  if (!result.ok) throw new Error(result.message);
  for (const stage of result.trace.stages.slice(0, 6))
    expect(stage.actions.length, stage.id).toBeGreaterThan(0);
});
it.each(CFOP_EXAMPLES)('reaches the documented case for $id', (example) => {
  const parsed = parseScramble(example.scramble);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error(parsed.message);
  const initial = engine.apply(engine.solved(), parsed.moves);
  const checked = validateFacelets(stateToFacelets(initial), engine.solved());
  expect(checked.ok).toBe(true);
  if (checked.ok) expect(engine.equals(checked.state, initial)).toBe(true);
  const result = solveCFOP(engine, initial);
  if (!result.ok) throw new Error(result.message);
  const targetStage = result.trace.stages.find((s) => s.id === example.stageId)!;
  expect(targetStage.actions.map((a) => a.caseId)).toContain(example.expectedCaseId);
  expect(replayMatchesRecordedStates(engine, result.trace)).toBe(true);
});
