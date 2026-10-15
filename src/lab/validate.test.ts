import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { prepareLabInput } from './input';
import type { LabRoute } from './types';
import { fixtureLabRoute, labContext } from '../../tests/fixtures/lab-context';
import { validateLabRoute, validateLabRouteSteps } from './validate';
import { createLabFrame } from './frames';
import { createLabBudget } from './budget';
import { exploreCross } from './cross';
import { planLabF2L } from './f2l/planner';
import { finalizeLabRoute } from './finalize';
import { createAdvancedRuntime } from '../methods/advanced/definition';
import type { TraceAction } from '../core/types';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});

it('admits a physically valid d+2 Lab cross while Advanced still rejects non-descending steps', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] }),
    context = labContext(engine),
    budget = createLabBudget({ now: () => 0 });
  const frame = createLabFrame(engine, input, { bottom: 'white', front: 'green' });
  let route: LabRoute | undefined;
  for (const event of exploreCross(engine, input, frame, context.table, budget, {
    extraLengths: [2],
  })) {
    if (event.kind !== 'cross' || event.candidate.moves.join(' ') !== "R R'") continue;
    for (const end of planLabF2L(engine, event.candidate, context.profiles, budget))
      if (end.kind === 'f2l') {
        route = finalizeLabRoute(context, input, end);
        break;
      }
    break;
  }
  expect(route).toBeDefined();
  expect(() => validateLabRoute(context, input, route, 'current')).not.toThrow();
  const a = route!.actions.find((a) => a.section === 'lab-cross')!;
  const advanced = {
    ...a,
    ruleId: 'advanced-cross-step',
    caseId: 'shortest-cross',
    cross: { distanceBefore: 0, distanceAfter: 1 },
  } as unknown as TraceAction;
  expect(createAdvancedRuntime(context.table).checkAction(engine, advanced, 'advanced-cross')).toBe(
    false,
  );
});

it('yields through physical replay and scoring, including finite orientation initialization', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'U', 'F'] });
  const route = fixtureLabRoute(engine, input, 'blue');
  const budget = createLabBudget({ now: () => 0 });
  let previous = 0,
    maxGap = 0;
  const iterator = validateLabRouteSteps(labContext(engine), input, route, 'current', budget);
  for (;;) {
    const next = iterator.next(),
      n = budget.snapshot().operations;
    maxGap = Math.max(maxGap, n - previous);
    previous = n;
    if (next.done) break;
  }
  expect(maxGap).toBeLessThanOrEqual(256);
});
it('independently rejects forged fingerprints, states, checkpoints, formulas, targets and scores', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'U', 'F'] });
  const route = fixtureLabRoute(engine, input);
  expect(validateLabRoute(labContext(engine), input, route, 'current').route).toEqual(route);
  const changes: ((r: LabRoute) => void)[] = [
    (r) => {
      r.inputFingerprint = 'forged';
    },
    (r) => {
      r.crossLength = r.crossMinimum + 3;
    },
    (r) => {
      r.startHold.front = r.startHold.bottom;
    },
    (r) => {
      r.actions[0].after = engine.solved();
    },
    (r) => {
      r.actions[0].checkpoint.predicate = 'solved';
    },
    (r) => {
      r.actions.find((a) => a.section === 'lab-f2l' && a.kind === 'algorithm')!.moves = ['R'];
    },
    (r) => {
      r.actions.find((a) => a.section === 'lab-f2l' && a.kind === 'algorithm')!.targets = [
        'UF',
        'UR',
      ];
    },
    (r) => {
      if (r.score.rated) r.score.cost++;
    },
    (r) => {
      if (r.score.rated) r.score.events[0].rationale = 'invented finger movement';
    },
    (r) => {
      r.setupMoves = [];
    },
  ];
  for (const change of changes) {
    const corrupt = structuredClone(route);
    change(corrupt);
    expect(() => validateLabRoute(labContext(engine), input, corrupt, 'current')).toThrow();
  }
});
it('permits physically validated old-model archives without relabeling them as current', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'U'] });
  const route = structuredClone(fixtureLabRoute(engine, input));
  route.modelVersion = 'historical-model';
  if (route.score.rated) route.score.modelVersion = 'historical-model';
  expect(() => validateLabRoute(labContext(engine), input, route, 'current')).toThrow();
  const result = validateLabRoute(labContext(engine), input, route, 'archive');
  expect(result.validationMode).toBe('archive');
  expect(result.route.modelVersion).toBe('historical-model');
  expect(Object.isFrozen(result.route)).toBe(true);
});

it('also yields while reconstructing a long legal original scramble', () => {
  const input = prepareLabInput(engine, {
    kind: 'scramble',
    moves: Array.from({ length: 512 }, () => 'R' as const),
  });
  const route = fixtureLabRoute(engine, input, 'yellow'),
    budget = createLabBudget({ now: () => 0 });
  const steps = validateLabRouteSteps(labContext(engine), input, route, 'current', budget);
  let previous = 0,
    maxGap = 0;
  for (;;) {
    const next = steps.next(),
      n = budget.snapshot().operations;
    maxGap = Math.max(maxGap, n - previous);
    previous = n;
    if (next.done) break;
  }
  expect(maxGap).toBeLessThanOrEqual(256);
});
