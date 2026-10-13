import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { parseScramble } from '../core/notation';
import { solveAdvancedCFOP } from '../methods/advanced/solve';
import { ADVANCED_STAGE_IDS } from '../methods/advanced/stages';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { getMethod } from '../methods/registry';
import { getCourse } from './courses';
import { ADVANCED_EXAMPLES, ADVANCED_GUIDED_SCRAMBLE } from './advanced-examples';
let engine: CubeEngine;
const assets = {
  crossTable: {
    version: 1 as const,
    goalIndex: 69760,
    distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
  },
};
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('opens_six_advanced_lessons', () => {
  const course = getCourse('cfop-advanced');
  expect(course.map((l) => l.id)).toEqual(['intro', ...ADVANCED_STAGE_IDS]);
  expect(getMethod('cfop-advanced').teachingStatus).toBe('preview');
  expect(getMethod('lbl').teachingStatus).toBe('accepted');
  expect(getMethod('cfop-beginner').teachingStatus).toBe('accepted');
  for (const lesson of course) {
    for (const field of ['goal', 'observe', 'prepare', 'check', 'tip'] as const)
      expect(lesson[field].length).toBeGreaterThan(20);
    for (const id of lesson.algorithmIds) expect(ALGORITHM_REGISTRY.variants[id]).toBeDefined();
  }
  expect(course[1].prepare).toMatch(/bottom|down/);
  expect(course[1].goal).toMatch(/shortest|minimum/);
  expect(course[3].goal).toMatch(/57/);
  expect(course[4].goal).toMatch(/21/);
});
it('every_named_example_hits_its_actual_catalog_case', () => {
  const cases = Object.keys(ALGORITHM_REGISTRY.cases);
  expect(ADVANCED_EXAMPLES.filter((e) => cases.includes(e.expectedCaseId))).toHaveLength(119);
  for (const example of ADVANCED_EXAMPLES) {
    const parsed = parseScramble(example.scramble);
    if (!parsed.ok) throw new Error(parsed.message);
    const r = solveAdvancedCFOP(engine, engine.apply(engine.solved(), parsed.moves), assets);
    if (!r.ok) throw new Error(example.id + ': ' + r.message);
    const stage = r.trace.stages.find((s) => s.id === example.stageId)!;
    expect(stage.checkpoint.passed, example.id).toBe(true);
    expect(
      stage.actions.some((a) => a.caseId === example.expectedCaseId),
      example.id,
    ).toBe(true);
  }
}, 120000);
it('guided_example_has_real_work_in_the_four_main_phases', () => {
  const parsed = parseScramble(ADVANCED_GUIDED_SCRAMBLE);
  if (!parsed.ok) throw new Error(parsed.message);
  const r = solveAdvancedCFOP(engine, engine.apply(engine.solved(), parsed.moves), assets);
  if (!r.ok) throw new Error(r.message);
  for (const stage of r.trace.stages.slice(0, 4))
    expect(stage.actions.length, stage.id).toBeGreaterThan(0);
});
