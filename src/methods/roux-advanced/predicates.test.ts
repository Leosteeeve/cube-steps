import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { createRouxSearchBudget, meterRouxEngine, RouxBudgetStop } from './budget';
import { ROUX_FRAMES } from './frames';
import { observeAdvancedFrame } from './predicates';
it('propagates budget termination rather than pretending the frame is invalid', async () => {
  const base = await createCubeEngine(),
    state = base.solved();
  const engine = meterRouxEngine(
    base,
    createRouxSearchBudget('normal', { now: () => 0, maxOperations: 0 }),
  );
  expect(() => observeAdvancedFrame(engine, state, ROUX_FRAMES[0])).toThrow(RouxBudgetStop);
});
