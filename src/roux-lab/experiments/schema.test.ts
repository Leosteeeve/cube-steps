import { beforeAll, expect, it } from 'vitest';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import {
  assertExperiment,
  assertAttempt,
  assertGraph,
  emptyRouxNotebook,
  assertNotebookLimits,
} from './schema';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
it('bounds labels, notes, route count and graph references', () => {
  const e = structuredClone(f.experiment);
  e.label = 'x'.repeat(60);
  assertExperiment(e);
  e.label += 'x';
  expect(() => assertExperiment(e)).toThrow();
  const a = attemptFixture(e.id, e.routes[0].id);
  a.note = 'x'.repeat(2000);
  assertAttempt(a);
  a.note += 'x';
  expect(() => assertAttempt(a)).toThrow();
  const n = emptyRouxNotebook();
  n.experiments = [f.experiment];
  n.attempts = [attemptFixture(e.id, e.routes[0].id)];
  expect(() => assertGraph(n)).toThrow(/absent.*tester/i);
  const foreign = { ...a, endpoint: 'cross-f2l', method: 'cfop-advanced' };
  expect(() => assertAttempt(foreign)).toThrow();
  expect(() => assertExperiment({ ...e, method: 'cfop-advanced' })).toThrow();
  // Structural boundary only; replay and content-address identity are checked separately.
  assertExperiment({
    ...f.experiment,
    routes: Array.from({ length: 4 }, (_, i) => ({
      ...f.experiment.routes[0],
      id: `route-boundary-${i}`,
    })),
  });
  expect(() =>
    assertExperiment({ ...f.experiment, routes: Array(5).fill(f.experiment.routes[0]) }),
  ).toThrow();
});
it('rejects accessor-bearing objects without evaluating them', () => {
  let read = false;
  const e = { ...f.experiment };
  Object.defineProperty(e, 'label', {
    get() {
      read = true;
      return 'unsafe';
    },
    enumerable: true,
  });
  expect(() => assertExperiment(e)).toThrow(/Accessors/);
  expect(read).toBe(false);
});
it('enforces exact transfer/store count limits including attempts plus revisions', () => {
  const n = emptyRouxNotebook();
  n.experiments = Array(50).fill(f.experiment);
  assertNotebookLimits(n);
  n.experiments.push(f.experiment);
  expect(() => assertNotebookLimits(n)).toThrow();
  n.experiments = [f.experiment];
  n.attempts = Array(2500).fill(attemptFixture(f.experiment.id, f.experiment.routes[0].id));
  n.attemptRevisions = [...n.attempts];
  assertNotebookLimits(n);
  n.attemptRevisions.push(n.attempts[0]);
  expect(() => assertNotebookLimits(n)).toThrow();
});
it('checks six comparisons per experiment and route token/action bounds', () => {
  const n = emptyRouxNotebook();
  n.experiments = [f.experiment];
  n.comparisons = Array.from({ length: 6 }, (_, i) => ({
    schemaVersion: 1 as const,
    id: `comparison-${i}`,
    experimentId: f.experiment.id,
    routeAId: f.experiment.routes[0].id,
    routeBId: f.experiment.routes[1].id,
    createdAt: f.experiment.createdAt,
  }));
  assertGraph(n);
  n.comparisons.push({ ...n.comparisons[0], id: 'overflow' });
  expect(() => assertGraph(n)).toThrow(/six/i);
  const e = structuredClone(f.experiment),
    action = e.routes[0].trace.stages.flatMap((s) => s.actions).find((a) => a.moves.length)!;
  for (const s of e.routes[0].trace.stages) s.actions = [];
  e.routes[0].trace.stages[0].actions = Array.from({ length: 128 }, () => ({
    ...action,
    moves: ['R', 'U', 'R', 'U'] as const,
  }));
  assertExperiment(e);
  e.routes[0].trace.stages[0].actions[0] = { ...action, moves: ['R', 'U', 'R', 'U', 'R'] };
  expect(() => assertExperiment(e)).toThrow(/512/);
  e.routes[0].trace.stages[0].actions = Array.from({ length: 129 }, () => ({
    ...action,
    moves: [],
  }));
  expect(() => assertExperiment(e)).toThrow(/128/);
});
