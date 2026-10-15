import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { createLabBudget, LabStopped } from '../budget';
import { EXECUTION_CATALOG } from '../execution/profiles';
import { enumerateLabInsertions } from './candidates';
import { createF2LRoot } from './planner';
import { labCrossForState } from '../../../tests/fixtures/lab-cases';
import { canonicalTargets, pairPlacement } from '../../../tests/fixtures/advanced-f2l';
import { observeF2LPairs, preservesF2L } from '../../methods/cfop/f2l-cases';
import type { F2LTarget } from '../../methods/advanced/f2l/types';
import { whiteCrossSolved } from '../../methods/shared/pieces';

let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
function root(state = engine.apply(engine.solved(), ['z2', 'R', 'U', "R'"])) {
  const cross = labCrossForState(engine, state);
  return createF2LRoot(engine, cross, EXECUTION_CATALOG, createLabBudget({ now: () => 0 }));
}
function insertions(node: ReturnType<typeof root>, target: F2LTarget) {
  return [
    ...enumerateLabInsertions(
      engine,
      node,
      target,
      node.frame,
      EXECUTION_CATALOG,
      createLabBudget({ now: () => 0 }),
    ),
  ]
    .filter((e) => e.kind === 'insertion')
    .map((e) => e.candidate);
}
it('offers protected formula insertions, including real y rotations and rear-slot options', () => {
  const node = root();
  const target = observeF2LPairs(engine, node.state).find((p) => !p.solved)! as F2LTarget;
  const candidates = insertions(node, target);
  expect(candidates.length).toBeGreaterThan(1);
  expect(candidates.length).toBeLessThanOrEqual(12);
  expect(candidates.some((c) => c.actions.some((a) => a.kind === 'rotation'))).toBe(true);
  expect(candidates.some((c) => c.target.slot.startsWith('B'))).toBe(true);
  let temporaryDisruption = false;
  for (const candidate of candidates) {
    expect(candidate.completedIds.length).toBeGreaterThan(node.completedIds.length);
    expect(preservesF2L(engine, node.state, candidate.state)).toBe(true);
    let state = node.frame.toPhysical(node.state);
    for (const action of candidate.actions.slice(node.actions.length)) {
      expect(engine.equals(state, action.before)).toBe(true);
      state = engine.apply(state, action.moves);
      expect(engine.equals(state, action.after)).toBe(true);
      let intermediate = action.before;
      for (const move of action.moves) {
        intermediate = engine.apply(intermediate, [move]);
        if (!whiteCrossSolved(engine, node.frame.toCanonical(intermediate)))
          temporaryDisruption = true;
      }
    }
    expect(engine.equals(state, node.frame.toPhysical(candidate.state))).toBe(true);
  }
  expect(temporaryDisruption).toBe(true);
});
it('extracts a trapped edge with a solved target corner and rejects no-progress insertions', () => {
  const target = canonicalTargets(engine).find((t) => t.slot === 'FR')!;
  const solved = engine.apply(engine.solved(), ['z2']);
  const corner = engine.observe(solved).corners.find((c) => c.id === target.cornerId)!;
  const index = solved.data.CORNERS.pieces.indexOf(
    ['UFR', 'URB', 'UBL', 'ULF'].indexOf(target.cornerId),
  );
  const node = root(
    pairPlacement(engine, target, corner.slot, solved.data.CORNERS.orientation[index], 'BR', 1),
  );
  const candidates = insertions(node, target);
  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates.every((c) => c.actions.some((a) => a.ruleId === 'lab-f2l-extract'))).toBe(true);
  expect(insertions(root(solved), target)).toEqual([]);
  const wrongCorner = root(pairPlacement(engine, target, 'DLB', 0, 'BR', 1));
  const rescued = insertions(wrongCorner, target);
  expect(rescued.length).toBeGreaterThan(0);
  for (const route of rescued) {
    expect(route.actions.filter((a) => a.ruleId === 'lab-f2l-extract').length).toBeLessThanOrEqual(
      2,
    );
    expect(preservesF2L(engine, wrongCorner.state, route.state)).toBe(true);
  }
});

it('charges repeated recognition and scoring even when engine transformation caches are warm', () => {
  const node = root();
  const target = observeF2LPairs(engine, node.state).find((p) => !p.solved)! as F2LTarget;
  const budget = createLabBudget({ now: () => 0 });
  const run = () => [
    ...enumerateLabInsertions(engine, node, target, node.frame, EXECUTION_CATALOG, budget),
  ];
  run();
  const before = budget.snapshot().operations;
  run();
  expect(budget.snapshot().operations).toBeGreaterThan(before);
  expect(budget.snapshot().entries).toBe(0);
});
it('can interrupt unsuccessful preparation and candidate scoring without leaking entries', () => {
  const node = root();
  const target = observeF2LPairs(engine, node.state).find((p) => !p.solved)! as F2LTarget;
  for (const cap of [0, 40, 400]) {
    const budget = createLabBudget({ now: () => 0, maxOperations: cap });
    expect(() => [
      ...enumerateLabInsertions(engine, node, target, node.frame, EXECUTION_CATALOG, budget),
    ]).toThrow(LabStopped);
    expect(budget.snapshot().operations).toBeLessThanOrEqual(cap);
    expect(budget.snapshot().entries).toBe(0);
  }
});

it('counts the retained insertion shortlist against the shared frontier limit', () => {
  const node = root();
  const target = observeF2LPairs(engine, node.state).find((p) => !p.solved)! as F2LTarget;
  const budget = createLabBudget({ now: () => 0, maxEntries: 1 });
  expect(() => [
    ...enumerateLabInsertions(engine, node, target, node.frame, EXECUTION_CATALOG, budget),
  ]).toThrow(/frontier-limit/);
  expect(budget.snapshot().entries).toBe(0);
});
