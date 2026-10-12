import { expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { parseScramble } from '../core/notation';
import { solveLBL } from '../methods/lbl/solve';
import { LBL_ALGORITHMS } from '../methods/lbl/catalog';
import { LBL_COURSE } from './lbl-course';
it('provides notation and seven checked teaching examples using the shared catalog', async () => {
  const engine = await createCubeEngine();
  expect(LBL_COURSE).toHaveLength(8);
  for (const lesson of LBL_COURSE) {
    const parsed = parseScramble(lesson.exampleScramble);
    if (!parsed.ok) throw new Error(parsed.message);
    const result = solveLBL(engine, engine.apply(engine.solved(), parsed.moves));
    if (!result.ok) throw new Error(result.message);
    expect(engine.isSolved(result.trace.final)).toBe(true);
    for (const id of lesson.algorithmIds) expect(LBL_ALGORITHMS[id]).toBeDefined();
    if (lesson.stageId)
      expect(
        result.trace.stages.find((s) => s.id === lesson.stageId)?.actions.length,
        `${lesson.stageId} must demonstrate real moves in the shared course example`,
      ).toBeGreaterThan(0);
  }
});
