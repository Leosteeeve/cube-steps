import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, SolveTrace } from '../../core/types';
import { parseScramble } from '../../core/notation';
import { GUIDED_SCRAMBLE } from '../../content/lbl-course';
import { solveLBL } from '../lbl/solve';
import { LBL_RUNTIME } from '../lbl/definition';
import { verifyTrace } from './verification';
let engine: CubeEngine, original: SolveTrace;
beforeAll(async () => {
  engine = await createCubeEngine();
  const parsed = parseScramble(GUIDED_SCRAMBLE);
  if (!parsed.ok) throw new Error(parsed.message);
  const result = solveLBL(engine, engine.apply(engine.solved(), parsed.moves));
  if (!result.ok) throw new Error(result.message);
  original = result.trace;
});
it('accepts a complete verified LBL trace', () =>
  expect(() => verifyTrace(engine, original, LBL_RUNTIME)).not.toThrow());
it.each(['method', 'order', 'before', 'after', 'final', 'catalog', 'skip'] as const)(
  'rejects corrupted %s',
  (field) => {
    const trace = structuredClone(original);
    if (field === 'method') Object.assign(trace, { method: 'cfop-beginner' });
    if (field === 'order') trace.stages.reverse();
    if (field === 'before') trace.stages[0].actions[0].before = engine.solved();
    if (field === 'after') trace.stages[0].actions[0].after = engine.solved();
    if (field === 'final') trace.final = trace.initial;
    if (field === 'catalog')
      trace.stages.flatMap((s) => s.actions).find((a) => a.algorithmId)!.algorithmId = 'pll-h';
    if (field === 'skip') trace.stages[0].status = 'skipped';
    expect(() => verifyTrace(engine, trace, LBL_RUNTIME)).toThrow();
  },
);
it('rechecks action effects rather than trusting a passed flag', () => {
  const action = original.stages[0].actions[0];
  expect(action.checkpoint.passed).toBe(true);
  expect(() =>
    verifyTrace(engine, original, { ...LBL_RUNTIME, checkAction: () => false }),
  ).toThrow();
});
it('rejects a daisy formula without a matched petal despite a passed flag', () => {
  const action = structuredClone(
    original.stages[0].actions.find((a) => a.algorithmId === 'daisy-to-cross')!,
  );
  action.before = engine.solved();
  action.after = engine.apply(action.before, action.moves);
  action.checkpoint.passed = true;
  expect(LBL_RUNTIME.checkAction(engine, action, 'white-cross')).toBe(false);
});
it('rejects missing stages even when the endpoint is solved', () => {
  const result = solveLBL(engine, engine.solved());
  if (!result.ok) throw new Error(result.message);
  result.trace.stages.pop();
  expect(() => verifyTrace(engine, result.trace, LBL_RUNTIME)).toThrow();
});
