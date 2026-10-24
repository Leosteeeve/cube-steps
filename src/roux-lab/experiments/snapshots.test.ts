import { beforeAll, expect, it } from 'vitest';
import { experimentFixture } from './fixtures.test-helper';
import { verifyRouxExperiment } from './snapshots';
import { initialRouxLabSession, reduceRouxLabSession } from '../../club/roux-lab/session';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
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
