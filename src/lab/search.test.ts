import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { prepareLabInput } from './input';
import { createLabBudget } from './budget';
import { labContext } from '../../tests/fixtures/lab-context';
import { fixtureLabRoute } from '../../tests/fixtures/lab-context';
import { searchLab, selectLabRoutes } from './search';
import type { LabRoute } from './types';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});

it('does not invent practice alternatives when every compared objective is already complete', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] });
  const routes = (['white', 'yellow', 'red', 'blue'] as const).map((color) =>
    fixtureLabRoute(engine, input, color),
  );
  expect(selectLabRoutes(routes)).toHaveLength(1);
  const archive = structuredClone(routes[0]);
  archive.modelVersion = 'historical';
  expect(selectLabRoutes([archive])).toEqual([]);
});
it('seeds every allowed color before optional exploration and preserves the best route on Stop', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'U'] });
  let cancel = false;
  const budget = createLabBudget({ now: () => 0, cancelled: () => cancel });
  const colors = ['red', 'blue', 'yellow'] as const;
  const events = [
    ...searchLab(
      labContext(engine),
      input,
      { allowedColors: colors, modelVersion: 'lab-execution-v1' },
      budget,
    ),
  ].filter((e) => e.kind !== 'work');
  const candidates = events.filter((e) => e.kind === 'candidate');
  expect(candidates[0].route.startHold.bottom).toBe('red');
  expect(new Set(candidates.map((e) => e.route.startHold.bottom))).toEqual(new Set(colors));
  expect(events.at(-1)).toMatchObject({ kind: 'done' });
  expect(budget.snapshot().entries).toBe(0);
  cancel = true;
  expect(
    [
      ...searchLab(
        labContext(engine),
        input,
        { allowedColors: colors, modelVersion: 'lab-execution-v1' },
        budget,
      ),
    ].at(-1),
  ).toMatchObject({ kind: 'done', reason: 'cancelled' });
});
it('reports a short deadline with no invented result and is deterministic under a work budget', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] }),
    settings = { allowedColors: ['white'] as const, modelVersion: 'lab-execution-v1' as const };
  expect(
    [
      ...searchLab(
        labContext(engine),
        input,
        settings,
        createLabBudget({ now: () => 1, startedAt: 0, deadlineMs: 0 }),
      ),
    ].at(-1),
  ).toMatchObject({ kind: 'done', reason: 'time-limit' });
  const run = () =>
    [
      ...searchLab(
        labContext(engine),
        input,
        settings,
        createLabBudget({ now: () => 0, maxOperations: 30_000 }),
      ),
    ].filter((e) => e.kind !== 'work');
  expect(run()).toEqual(run());
  const routes = run()
    .filter((e) => e.kind === 'candidate')
    .map((e) => e.route);
  expect(selectLabRoutes(routes).length).toBeLessThanOrEqual(4);
  expect(selectLabRoutes(routes.slice(0, 1))).toHaveLength(1);
  let best = Infinity;
  for (let i = 1; i <= routes.length; i++) {
    const chosen = selectLabRoutes(routes.slice(0, i))[0] as LabRoute;
    if (chosen.score.rated) {
      expect(chosen.score.cost).toBeLessThanOrEqual(best);
      best = chosen.score.cost;
    }
  }
});

it('cycles through all front holds and d/d+1/d+2 roots, and Stop retains a verified incumbent', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] }),
    context = labContext(engine);
  let cancel = false;
  const budget = createLabBudget({ now: () => 0, cancelled: () => cancel, maxOperations: 150_000 });
  const candidates: LabRoute[] = [];
  let coverage;
  for (const event of searchLab(
    context,
    input,
    { allowedColors: ['white'], modelVersion: 'lab-execution-v1' },
    budget,
  )) {
    if (event.kind === 'candidate') candidates.push(event.route);
    if (event.kind === 'progress') {
      coverage = event.coverage;
      if (coverage.colors.white!.holds.length === 4 && coverage.colors.white!.lengths.length === 3)
        cancel = true;
    }
    if (event.kind === 'done') expect(event.reason).toBe('cancelled');
  }
  expect(coverage!.colors.white!.holds).toHaveLength(4);
  expect(coverage!.colors.white!.lengths).toEqual([0, 1, 2]);
  expect(candidates.length).toBeGreaterThan(0);
  expect(engine.isSolved(candidates[0].final)).toBe(true);
  expect(budget.snapshot().entries).toBe(0);
});

it('discards a later failed finalization and keeps the already-verified recommendation', () => {
  let failOneComparison = false,
    injected = false;
  const guarded: CubeEngine = {
    ...engine,
    equals(a, b) {
      if (failOneComparison) {
        failOneComparison = false;
        return false;
      }
      return engine.equals(a, b);
    },
  };
  const input = prepareLabInput(guarded, { kind: 'scramble', moves: [] }),
    routes: LabRoute[] = [];
  let last;
  for (const event of searchLab(
    labContext(guarded),
    input,
    { allowedColors: ['white'], modelVersion: 'lab-execution-v1' },
    createLabBudget({ now: () => 0, maxOperations: 40_000 }),
  )) {
    if (event.kind === 'candidate') {
      routes.push(event.route);
      if (!injected) {
        injected = true;
        failOneComparison = true;
      }
    }
    if (event.kind === 'done') last = event;
  }
  expect(routes.length).toBeGreaterThan(0);
  const chosen = selectLabRoutes(routes)[0];
  expect(
    chosen.score.rated && routes[0].score.rated && chosen.score.cost <= routes[0].score.cost,
  ).toBe(true);
  expect(engine.isSolved(routes[0].final)).toBe(true);
  expect(last?.coverage.rejectedCandidates).toBeGreaterThan(0);
});
