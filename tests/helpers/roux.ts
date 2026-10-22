import assert from 'node:assert/strict';
import type { CubeEngine, CubeState, SolveTrace } from '../../src/core/types';
import type { RouxPlanResult } from '../../src/methods/roux/types';
import { readFileSync } from 'node:fs';
import { loadRouxAssets } from '../../src/methods/roux/assets';
import { verifyTrace } from '../../src/methods/shared/verification';
import { ROUX_RUNTIME } from '../../src/methods/roux/definition';
import { ROUX_STAGE_IDS } from '../../src/methods/roux/stages';
import { rouxSolved } from '../../src/methods/roux/predicates';
import { encodeLse } from '../../src/methods/roux/lse/coordinates';
export function assertCompleteRouxTrace(
  engine: CubeEngine,
  initial: CubeState,
  trace: SolveTrace,
): void {
  assert(engine.equals(initial, trace.initial));
  assert.equal(trace.method, 'roux-beginner');
  assert.deepEqual(
    trace.stages.map((s) => s.id),
    ROUX_STAGE_IDS,
  );
  verifyTrace(engine, trace, ROUX_RUNTIME);
  assert(rouxSolved(engine, trace.final));
  assert(encodeLse(engine, trace.stages[4].after));
  const actions = trace.stages.flatMap((s) => s.actions);
  assert(actions.length <= 160);
  assert(actions.reduce((n, a) => n + a.moves.length, 0) <= 400);
  for (const s of trace.stages) {
    assert(s.checkpoint.passed);
    if (s.status === 'skipped') assert(s.skipReason && s.actions.length === 0);
    for (const a of s.actions) assert(a.roux && a.checkpoint.passed);
  }
}
export const loadTestRouxAssets = () =>
  loadRouxAssets((async (input) => {
    const name = String(input).includes('block-policies')
      ? 'block-policies.json'
      : 'lse-policies.bin';
    return new Response(new Uint8Array(readFileSync('src/methods/roux/data/' + name)));
  }) as typeof fetch);
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
