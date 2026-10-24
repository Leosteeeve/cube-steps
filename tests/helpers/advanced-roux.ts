import assert from 'node:assert/strict';
import type { CubeEngine, CubeState } from '../../src/core/types';
import type { AdvancedRouxActionDraft, RouxFrame } from '../../src/methods/roux-advanced/types';
import { observeAdvancedFrame } from '../../src/methods/roux-advanced/predicates';
export function assertAdvancedDrafts(
  engine: CubeEngine,
  initial: CubeState,
  actions: readonly AdvancedRouxActionDraft[],
  frame: RouxFrame,
): CubeState {
  let state = initial;
  for (const action of actions) {
    assert.equal(action.rouxAdvanced.frameId, frame.id);
    assert(action.recognition && action.explanation && action.rouxAdvanced.goal);
    const before = engine.observe(state),
      pieces = [...before.edges, ...before.corners];
    const protectedPieces = action.rouxAdvanced.protectedIds.map((id) => {
      const piece = pieces.find((p) => p.id === id);
      assert(piece, `Missing protected piece ${id}`);
      return piece;
    });
    const checkProtected = () => {
      const observation = engine.observe(state);
      for (const piece of protectedPieces)
        assert.deepEqual(
          [...observation.edges, ...observation.corners].find((p) => p.id === piece.id),
          piece,
        );
    };
    for (const move of action.moves) {
      state = engine.apply(state, [move]);
      if (action.rouxAdvanced.protection === 'always') checkProtected();
    }
    checkProtected();
    const observed = observeAdvancedFrame(engine, state, frame);
    assert.equal(observed.centerPhase, action.rouxAdvanced.centerPhaseAfter);
    if (action.rouxAdvanced.cornerOffsetAfter !== undefined)
      assert.equal(observed.cornerOffset, action.rouxAdvanced.cornerOffsetAfter);
    if (action.check) assert(action.check.test(state), action.check.description);
  }
  return state;
}
