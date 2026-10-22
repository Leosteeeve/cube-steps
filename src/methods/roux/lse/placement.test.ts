import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { rouxSolved, cornerOffset, blockComplete } from '../predicates';
import { createRouxBudget } from '../budget';
import { generateLsePolicies, independentLseDomain, type LseTables } from './policies';
import { createLseModel } from './model';
import { lseAt, decodeLse } from './coordinates';
import { leftRightEdgesPlaced, planLeftRightEdges, planLastFourEdges } from './placement';
import { assertRouxActions } from '../../../../tests/helpers/roux';
let e: CubeEngine, tables: LseTables;
beforeAll(async () => {
  e = await createCubeEngine();
  tables = generateLsePolicies(e);
});
it('uses the corner-relative meaning for every U offset and both valid center phases', () => {
  for (let offset = 0; offset < 4; offset++)
    for (const phase of [0, 2]) {
      const state = e.apply(rouxReferenceState(e), [
        ...Array(phase).fill('M'),
        ...Array(offset).fill('U'),
      ]);
      expect(leftRightEdgesPlaced(e, state)).toBe(true);
      expect(rouxSolved(e, state)).toBe(offset === 0 && phase === 0);
      const result = planLastFourEdges(e, state, tables, createRouxBudget());
      assertRouxActions(e, state, result);
      if (!result.ok) throw Error(result.message);
      expect(rouxSolved(e, result.state)).toBe(true);
      if (offset === 0 && phase === 0) expect(result.actions).toEqual([]);
    }
});
it('rejects swapped yellow target identities even when their yellow stickers still face up', () => {
  const state = decodeLse(e, {
    edges: [0, 3, 2, 1, 5, 4],
    flips: [0, 0, 0, 0, 0, 0],
    phase: 0,
    offset: 0,
  });
  expect(leftRightEdgesPlaced(e, state)).toBe(false);
});
it('places and finishes every one of the 2880 oriented edge states with truthful physical drafts', () => {
  const model = createLseModel(e);
  let count = 0;
  for (const code of independentLseDomain()) {
    const c = lseAt(code);
    if (!model.goal(c, 'orientation')) continue;
    const state = decodeLse(e, c),
      lr = planLeftRightEdges(e, state, tables, createRouxBudget());
    assertRouxActions(e, state, lr);
    if (!lr.ok) throw Error(`${code}: ${lr.message}`);
    expect(leftRightEdgesPlaced(e, lr.state)).toBe(true);
    const finish = planLastFourEdges(e, lr.state, tables, createRouxBudget());
    assertRouxActions(e, lr.state, finish);
    if (!finish.ok) throw Error(`${code}: ${finish.message}`);
    let cursor = lr.state;
    for (const action of finish.actions) {
      cursor = e.apply(cursor, action.moves);
      expect(leftRightEdgesPlaced(e, cursor)).toBe(true);
      expect(cornerOffset(e, cursor)).not.toBeNull();
      expect(blockComplete(e, cursor, 'left') && blockComplete(e, cursor, 'right')).toBe(true);
    }
    expect(rouxSolved(e, finish.state)).toBe(true);
    count++;
  }
  expect(count).toBe(2880);
}, 120000);
