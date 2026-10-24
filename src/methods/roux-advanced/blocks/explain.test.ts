import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { ROUX_FRAMES } from '../frames';
import { prepareRouxInput } from '../input';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { assertAdvancedDrafts } from '../../../../tests/helpers/advanced-roux';
import { explainBlockRoute, compactBlockMoves } from './explain';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
function forRoute(first: TeachingMove[], second: TeachingMove[]) {
  const held = e.apply(e.solved(), frame.positioningMoves);
  const initial = e.apply(
    e.apply(held, invertTeachingMoves([...first, ...second])),
    invertTeachingMoves(frame.positioningMoves),
  );
  return { ...prepareRouxInput(e, { kind: 'scramble', moves: [] }), initial };
}
it('explains actual connections and all source endpoints after adjacent compaction', () => {
  const first: TeachingMove[] = ['U', "F'", 'F2'],
    second: TeachingMove[] = ['Rw'];
  const input = forRoute(first, second),
    held = e.apply(input.initial, frame.positioningMoves);
  const compact = compactBlockMoves(e, held, first);
  expect(compact).toEqual(['U', 'F']);
  const source = explainBlockRoute(e, input, frame, first, second);
  const joined = explainBlockRoute(e, input, frame, compact, second);
  expect(
    e.equals(
      assertAdvancedDrafts(e, held, source, frame),
      assertAdvancedDrafts(e, held, joined, frame),
    ),
  ).toBe(true);
  expect(source.every((a) => a.recognition && a.explanation && a.check)).toBe(true);
});
it('rejects a repeated full physical state instead of explaining a waste loop', () => {
  const first: TeachingMove[] = ['R', "R'", 'F'],
    input = forRoute(first, []);
  expect(() => explainBlockRoute(e, input, frame, first, [])).toThrow(/repeated physical state/);
});
it('allows the same useful maneuver twice when the physical states differ', () => {
  const first: TeachingMove[] = ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"];
  const input = forRoute(first, []);
  const actions = explainBlockRoute(e, input, frame, first, []);
  expect(actions.flatMap((a) => a.moves)).toEqual(first);
  assertAdvancedDrafts(e, e.apply(input.initial, frame.positioningMoves), actions, frame);
});
it('groups temporary first-block movement until its truthful restored checkpoint', () => {
  const second: TeachingMove[] = ["F'", 'U', 'F'];
  const input = forRoute([], second);
  const actions = explainBlockRoute(e, input, frame, [], second);
  expect(actions).toHaveLength(1);
  expect(actions[0].rouxAdvanced.protection).toBe('endpoint');
  assertAdvancedDrafts(e, e.apply(input.initial, frame.positioningMoves), actions, frame);
});
