import { beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { ALGORITHM_REGISTRY as registry } from '../algorithms/registry';
import { getCaseFixture } from '../algorithms/fixtures';
import { verifyDemonstration } from '../algorithms/demonstration';
import { generatePracticeExercise } from './generate';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('generates_exact_selected_case', () => {
  for (const c of Object.values(registry.cases)) {
    for (const fixtureId of c.fixtureIds) {
      const req = { requestId: 1, caseId: c.id, fixtureId, variantId: c.defaultVariantId },
        exercise = generatePracticeExercise(engine, req);
      expect(exercise).toMatchObject({ caseId: c.id, fixtureId, variantId: c.defaultVariantId });
      expect(() => verifyDemonstration(engine, exercise.demonstration)).not.toThrow();
      expect(
        engine.equals(
          engine.apply(engine.solved(), [
            ...exercise.demonstration.setup,
            ...exercise.demonstration.holdingMoves,
          ]),
          exercise.demonstration.initial,
        ),
      ).toBe(true);
    }
    for (const variantId of c.variantIds)
      expect(
        generatePracticeExercise(engine, {
          requestId: 1,
          caseId: c.id,
          fixtureId: c.fixtureIds[0],
          variantId,
        }).demonstration.checkpoint.passed,
      ).toBe(true);
  }
}, 120000);
it('validates_physical_setup_and_prerequisites', () => {
  const f = getCaseFixture('f2l-01/fr/mixed/u0')!,
    original = [...f.setup];
  // Simulate damaged fixture bytes; the generator must re-check the admitted identity.
  try {
    (f.setup as string[]).splice(0, f.setup.length, 'R');
    expect(() =>
      generatePracticeExercise(engine, {
        requestId: 1,
        caseId: f.caseId,
        fixtureId: f.id,
        variantId: registry.cases[f.caseId].defaultVariantId,
      }),
    ).toThrow();
  } finally {
    (f.setup as string[]).splice(0, f.setup.length, ...original);
  }
  const exercise = generatePracticeExercise(engine, {
    requestId: 1,
    caseId: f.caseId,
    fixtureId: f.id,
    variantId: registry.cases[f.caseId].defaultVariantId,
  });
  expect(exercise.demonstration.checkpoint.passed).toBe(true);
  expect(engine.isSolved(exercise.demonstration.final)).toBe(false);
});
it('rejects_cross_case_variants', () => {
  for (const patch of [{ variantId: 'pll-z/main' }, { caseId: 'oll-20' }, { fixtureId: 'missing' }])
    expect(() =>
      generatePracticeExercise(engine, {
        requestId: 1,
        caseId: 'f2l-01',
        fixtureId: 'f2l-01/fr/u0',
        variantId: 'f2l-01/main/fr',
        ...patch,
      }),
    ).toThrow();
});
