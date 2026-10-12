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
  expect(
    result.trace.stages.map((s) => ({
      id: s.id,
      actions: s.actions.map((a) => ({
        rule: a.ruleId,
        case: a.caseId,
        moves: a.moves.join(' '),
        checkpoint: a.checkpoint.id,
      })),
    })),
  ).toMatchSnapshot();
});
