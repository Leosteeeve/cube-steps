import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { createRouxBudget } from '../budget';
import { generateLsePolicies, type LseTables } from './policies';
import { observeLseEO, planEdgeOrientation } from './orientation';
import { assertRouxActions } from '../../../../tests/helpers/roux';
import { rouxFixture } from '../../../../tests/fixtures/roux-cases';
let e: CubeEngine, tables: LseTables;
beforeAll(async () => {
  e = await createCubeEngine();
  tables = generateLsePolicies(e);
});
it.each(['lse-six-bad', 'lse-front-arrow', 'lse-back-arrow'])(
  'explains the legal %s fixture',
  (id) => {
    const state = rouxFixture(e, id),
      result = planEdgeOrientation(e, state, tables, createRouxBudget());
    if (id === 'lse-six-bad')
      expect(observeLseEO(e, state)).toMatchObject({
        badIds: expect.arrayContaining(['DF', 'DR', 'DB', 'DL', 'UR', 'UL']),
      });
    assertRouxActions(e, state, result);
    if (!result.ok) throw Error(result.message);
    expect(result.actions.some((a) => a.caseId.includes('prepared-arrow'))).toBe(true);
  },
);
it('asks for reference setup at odd M phases without calling the cube invalid', () => {
  for (const moves of [['M'], ["M'"]] as const)
    expect(observeLseEO(e, e.apply(rouxReferenceState(e), moves))).toEqual({
      reference: 'setup-required',
      badIds: null,
    });
});
it('solves every orientation pattern in each center phase with truthful checkpoints', () => {
  const counts = new Set<number>();
  let increases = 0,
    arrows = 0;
  for (let bits = 0; bits < 32; bits++)
    for (let phase = 0; phase < 4; phase++) {
      const initial = structuredClone(rouxReferenceState(e));
      let parity = 0;
      for (let i = 0; i < 5; i++) {
        const flip = (bits >> i) & 1;
        initial.data.EDGES.orientation[i] ^= flip;
        parity ^= flip;
      }
      initial.data.EDGES.orientation[6] ^= parity;
      const state = e.apply(initial, Array(phase).fill('M')),
        result = planEdgeOrientation(e, state, tables, createRouxBudget());
      const start = observeLseEO(e, state);
      if (start.reference === 'ready') counts.add(start.badIds.length);
      assertRouxActions(e, state, result);
      if (!result.ok) throw Error(result.message);
      expect(observeLseEO(e, result.state)).toEqual({ reference: 'ready', badIds: [] });
      let cursor = state;
      for (const a of result.actions) {
        const before = observeLseEO(e, cursor);
        cursor = e.apply(cursor, a.moves);
        const after = observeLseEO(e, cursor);
        expect(a.moves.every((m) => /^[MU](2|')?$/.test(m))).toBe(true);
        if (
          before.reference === 'ready' &&
          after.reference === 'ready' &&
          after.badIds.length > before.badIds.length
        ) {
          increases++;
          expect(a.explanation).toContain('temporarily more');
        }
        if (a.caseId.includes('prepared-arrow')) {
          arrows++;
          expect(a.explanation).toContain('prepared arrow');
        }
      }
    }
  expect([...counts].sort()).toEqual([0, 2, 4, 6]);
  expect(increases).toBeGreaterThan(0);
  expect(arrows).toBeGreaterThan(0);
});
it('returns a stage-specific budget failure', () => {
  expect(
    planEdgeOrientation(
      e,
      e.apply(rouxReferenceState(e), ['M']),
      tables,
      createRouxBudget({ maxNodes: 0 }),
    ),
  ).toMatchObject({ ok: false, code: 'budget', stageId: 'roux-edge-orientation' });
});
