import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { solveLBL } from './solve';
import { createTraceBuilder, flattenTrace } from './trace';
import { LBL_STAGE_IDS } from './stages';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('skips all seven stages for solved and rotated solved inputs', () => {
  for (const initial of [engine.solved(), engine.apply(engine.solved(), ['y', 'z2'])]) {
    const result = solveLBL(engine, initial);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.trace.stages.map((s) => s.id)).toEqual(LBL_STAGE_IDS);
    expect(result.trace.stages.every((s) => s.status === 'skipped' && Boolean(s.skipReason))).toBe(
      true,
    );
    expect(flattenTrace(result.trace).moves).toHaveLength(0);
  }
});
it('returns a structured failure when its action or move budget is exhausted', () => {
  const initial = engine.apply(engine.solved(), ['R', 'U']);
  expect(solveLBL(engine, initial, { maxActions: 0, maxMoves: 4096 })).toMatchObject({
    ok: false,
    code: 'budget',
  });
  expect(solveLBL(engine, initial, { maxActions: 512, maxMoves: 0 })).toMatchObject({
    ok: false,
    code: 'budget',
  });
});
it('stops a repeating rule/state combination', () => {
  const trace = createTraceBuilder(engine, engine.solved());
  trace.beginStage('white-cross');
  const action = {
    kind: 'setup' as const,
    ruleId: 'loop',
    caseId: 'fixture',
    targets: ['UF'],
    recognition: 'Test fixture',
    explanation: 'A whole face cycle repeats the state.',
    moves: ['U', 'U', 'U', 'U'] as const,
  };
  trace.append({ ...action, moves: [...action.moves] });
  expect(() => trace.append({ ...action, moves: [...action.moves] })).toThrow(/repeated/);
});
