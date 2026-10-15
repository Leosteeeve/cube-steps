import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { createLabBudget } from '../budget';
import { EXECUTION_CATALOG } from '../execution/profiles';
import { planLabF2L, createF2LRoot, f2lNodeKey } from './planner';
import { labCrossForState } from '../../../tests/fixtures/lab-cases';
import { observeF2LPairs } from '../../methods/cfop/f2l-cases';
import { firstTwoLayersSolved } from '../../methods/shared/pieces';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const opens: TeachingMove[][] = [
  ['R', 'U', "R'"],
  ["L'", 'U', 'L'],
  ['L', 'U', "L'"],
  ["R'", 'U', 'R'],
];
it('finds complete F2L from zero through four already-solved pairs and returns cooperative work', () => {
  for (let n = 0; n <= 4; n++) {
    const state = engine.apply(engine.solved(), ['z2', ...opens.slice(0, n).flat()]);
    expect(observeF2LPairs(engine, state).filter((p) => p.solved)).toHaveLength(4 - n);
    const budget = createLabBudget({ now: () => 0 });
    const iterator = planLabF2L(engine, labCrossForState(engine, state), EXECUTION_CATALOG, budget);
    let work = 0,
      complete = false;
    for (const event of iterator) {
      if (event.kind === 'work') {
        work++;
        continue;
      }
      expect(firstTwoLayersSolved(engine, event.node.state)).toBe(true);
      expect(event.node.completedIds).toHaveLength(4);
      expect(event.node.paths.length).toBeGreaterThan(0);
      complete = true;
      break;
    }
    expect(complete).toBe(true);
    expect(work).toBeGreaterThan(0);
    expect(budget.snapshot().entries).toBe(0);
  }
}, 30_000);

it('can choose a different pair order and a locally dearer insertion for a cheaper complete route', () => {
  const state = engine.apply(engine.solved(), ['z2', 'R', 'U2', "R'", "L'", 'U', 'L']);
  const budget = createLabBudget({ now: () => 0 });
  const routes = [...planLabF2L(engine, labCrossForState(engine, state), EXECUTION_CATALOG, budget)]
    .filter((e) => e.kind === 'f2l')
    .map((e) => e.node);
  const prefixCost = (node: (typeof routes)[number]) => {
    const end = node.actions.findIndex((a) => a.ruleId === 'lab-f2l-insert');
    const boundary = node.actions.slice(0, end + 1).flatMap((a) => a.moves).length;
    return node.paths[0].score.events
      .filter((e) => e.boundary < boundary)
      .reduce(
        (sum, e) =>
          sum +
          e.count * { turn: 1, rotation: 2, 'hand-regrip': 2, visibility: 3, awkward: 2 }[e.kind],
        0,
      );
  };
  const first = routes[0];
  const better = routes.find(
    (r) => r.paths[0].score.cost < first.paths[0].score.cost && prefixCost(r) > prefixCost(first),
  );
  expect(better).toBeDefined();
  expect(better!.actions.find((a) => a.ruleId === 'lab-f2l-insert')!.targets[0]).not.toBe(
    first.actions.find((a) => a.ruleId === 'lab-f2l-insert')!.targets[0],
  );
  expect(budget.snapshot().entries).toBe(0);
});

it('keys cached beams by full state, physical frame, completed pairs and continuous grip paths', () => {
  const cross = labCrossForState(engine, engine.apply(engine.solved(), ['z2', 'R', 'U', "R'"]));
  const node = createF2LRoot(engine, cross, EXECUTION_CATALOG, createLabBudget({ now: () => 0 }));
  const key = f2lNodeKey(node, EXECUTION_CATALOG);
  expect(
    f2lNodeKey(
      { ...node, paths: node.paths.map((p) => ({ ...p, terminalGrip: 'l1r0' })) },
      EXECUTION_CATALOG,
    ),
  ).not.toBe(key);
  expect(
    f2lNodeKey({ ...node, state: engine.apply(node.state, ['y']) }, EXECUTION_CATALOG),
  ).not.toBe(key);
  expect(f2lNodeKey({ ...node, completedIds: [] }, EXECUTION_CATALOG)).not.toBe(key);
});
