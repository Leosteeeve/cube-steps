import { beforeAll, expect, it } from 'vitest';
import { experimentFixture } from './fixtures.test-helper';
import { createRouxExperiment, verifyRouxExperiment } from './snapshots';
import { withBasicLse } from '../../methods/roux-advanced/complete';
import { createRouxSearchBudget } from '../../methods/roux-advanced/budget';
import { validateRouxRoute } from '../../methods/roux-advanced/validate';
import { initialRouxLabSession, reduceRouxLabSession } from '../../club/roux-lab/session';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
it('saves and independently reloads basic LSE maneuvers whose identity is their catalog key', async () => {
  const route = validateRouxRoute(
    f.engine,
    withBasicLse(
      f.engine,
      f.experiment.routes[0],
      f.assets,
      createRouxSearchBudget('normal', { now: () => 0 }),
    ),
    f.assets,
  );
  expect(Object.values(route.formulas).some((a) => !('id' in a))).toBe(true);
  const saved = createRouxExperiment({ ...f.experiment, routes: [route] }, [route.id]);
  const loaded = await verifyRouxExperiment(f.engine, JSON.parse(JSON.stringify(saved)), f.assets);
  expect(loaded.routes[0].formulas).toEqual(route.formulas);
  expect(loaded.routes[0].lseMode).toBe('basic');
});
it('loads exact verified archival routes and settings without launching a search', async () => {
  const historical = structuredClone(f.experiment);
  historical.versions.catalog = 'historical-cmll';
  for (const r of historical.routes) r.versions.catalog = 'historical-cmll';
  const e = await verifyRouxExperiment(f.engine, historical, f.assets),
    state = reduceRouxLabSession(initialRouxLabSession(), { type: 'load', experiment: e });
  expect(state.status).toBe('complete');
  expect(state.experimentId).toBe(e.id);
  expect(state.routes.map((r) => r.id)).toEqual(e.routes.map((r) => r.id));
  expect(state.routes[0].formulas).toEqual(historical.routes[0].formulas);
  expect(state.settings).toEqual(e.settings);
  expect(() =>
    reduceRouxLabSession(initialRouxLabSession(), { type: 'load', experiment: structuredClone(e) }),
  ).toThrow(/verified/i);
});
