import { beforeAll, expect, it } from 'vitest';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import { assertExperiment, assertAttempt, assertGraph, emptyLabData } from './schema';
import { createComparison } from './snapshots';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
it('bounds snapshots and requires versions, definitions, settings and actual holds', () => {
  expect(() => assertExperiment(f.experiment)).not.toThrow();
  for (const change of [
    (x: any) => x.routes.push(...x.routes, ...x.routes),
    (x: any) => delete x.appVersion,
    (x: any) => (x.diagramHold.bottom = 'pink'),
    (x: any) => (x.setupMoves = null),
    (x: any) => (x.settings.allowedColors = []),
    (x: any) => (x.routes[0].formulas = {}),
  ]) {
    const x = structuredClone(f.experiment);
    change(x);
    expect(() => assertExperiment(x)).toThrow();
  }
});
it('never infers adherence, setup or valid duration and bounds user text and ratings', () => {
  const a = attemptFixture(f.experiment.id, f.experiment.routes[0].id);
  expect(() => assertAttempt(a)).not.toThrow();
  for (const patch of [
    { rawMs: 0 },
    { rawMs: NaN },
    { rawMs: null },
    { setupConfirmed: false },
    { holdConfirmed: false },
    { interruption: 'blur' },
    { note: 'x'.repeat(2001) },
    { flow: 0 },
    { recognition: 6 },
    { previousRevision: 2 },
  ])
    expect(() => assertAttempt({ ...a, ...patch })).toThrow();
  expect(() => assertAttempt({ ...a, kind: 'warmup', rawMs: null })).not.toThrow();
  expect(() =>
    assertAttempt({
      ...a,
      outcome: 'interrupted',
      rawMs: null,
      setupConfirmed: false,
      holdConfirmed: false,
      interruption: 'blur',
    }),
  ).not.toThrow();
});
it('rejects broken graph references and more than six comparisons', () => {
  const data = emptyLabData();
  data.experiments.push(f.experiment);
  const c = createComparison(
    f.experiment,
    ...(f.experiment.routes.map((r) => r.id) as [string, string]),
  );
  data.comparisons.push(c);
  expect(() => assertGraph(data)).not.toThrow();
  data.attempts.push(attemptFixture(f.experiment.id, 'missing'));
  expect(() => assertGraph(data)).toThrow();
  data.attempts = [];
  data.comparisons = Array.from({ length: 7 }, () => ({ ...c, id: crypto.randomUUID() }));
  expect(() => assertGraph(data)).toThrow();
});
