import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { parseScramble } from '../../core/notation';
import { GUIDED_SCRAMBLE } from '../../content/lbl-course';
import { solveLBL } from './solve';
it('preserves the deployed daisy lesson trace', async () => {
  const engine = await createCubeEngine(),
    parsed = parseScramble(GUIDED_SCRAMBLE);
  if (!parsed.ok) throw new Error(parsed.message);
  const result = solveLBL(engine, engine.apply(engine.solved(), parsed.moves));
  if (!result.ok) throw new Error(result.message);
  const finalStage = result.trace.stages.find((s) => s.id === 'corner-orientation')!;
  expect(finalStage.actions[0]).toMatchObject({ kind: 'regrip', moves: ['x2'] });
  const twists = finalStage.actions.filter((a) => a.ruleId === 'final-corner-twist');
  expect(twists.map((a) => a.repetition?.index)).toEqual([1, 2, 1, 2, 3, 4]);
  expect(twists.every((a) => a.moves.join(' ') === "R U R' U'")).toBe(true);
  expect(
    result.trace.stages.map((s) => ({
      id: s.id,
      actions: s.actions
        .flatMap((a) => a.joined?.sources ?? [a])
        .map((a) => ({
          rule: a.ruleId,
          case: a.caseId,
          moves: a.moves.join(' '),
          checkpoint: a.checkpoint.id,
        })),
    })),
  ).toMatchSnapshot();
});
