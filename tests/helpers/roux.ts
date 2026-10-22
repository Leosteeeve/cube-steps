import assert from 'node:assert/strict';
import type { CubeEngine, CubeState } from '../../src/core/types';
import type { RouxPlanResult } from '../../src/methods/roux/types';
export function assertRouxActions(
  engine: CubeEngine,
  initial: CubeState,
  result: RouxPlanResult,
): void {
  assert(result.ok, result.ok ? '' : result.message);
  let state = initial;
  for (const action of result.actions) {
    assert(
      action.moves.length &&
        action.ruleId &&
        action.caseId &&
        action.recognition &&
        action.explanation,
    );
    const before = engine.observe(state);
    const locks = [...before.edges, ...before.corners].filter((p) =>
      action.roux.protectedIds.includes(p.id),
    );
    for (const move of action.moves) {
      state = engine.apply(state, [move]);
      if (action.roux.protection === 'always') {
        const current = engine.observe(state);
        for (const lock of locks)
          assert.deepEqual(
            [...current.edges, ...current.corners].find((p) => p.id === lock.id),
            lock,
          );
      }
    }
    const after = engine.observe(state);
    for (const lock of locks)
      assert.deepEqual(
        [...after.edges, ...after.corners].find((p) => p.id === lock.id),
        lock,
      );
    if (action.check) assert(action.check.test(state), action.check.description);
  }
  assert(engine.equals(state, result.state));
}
