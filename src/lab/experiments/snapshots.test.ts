import { beforeAll, expect, it } from 'vitest';
import { experimentFixture } from './fixtures.test-helper';
import { createExperiment, createComparison, verifyExperiment } from './snapshots';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
it('freezes exact verified routes and rejects missing, cross-input or forged wrappers', async () => {
  expect(Object.isFrozen(f.experiment.routes[0].actions)).toBe(true);
  expect(() => (f.experiment.routes[0].crossLength = 0)).toThrow();
  expect(() => createExperiment(f.snapshot, [])).toThrow();
  expect(() => createExperiment(f.snapshot, ['missing'])).toThrow();
  expect(() =>
    createExperiment({ ...f.snapshot, inputFingerprint: 'different' }, [
      f.snapshot.routes[0].route.id,
    ]),
  ).toThrow();
  expect(() =>
    createExperiment({ ...f.snapshot, routes: f.snapshot.routes.map((r) => ({ ...r })) }, [
      f.snapshot.routes[0].route.id,
    ]),
  ).toThrow();
  expect(() =>
    createExperiment(f.snapshot, [f.snapshot.routes[0].route.id], 'x'.repeat(61)),
  ).toThrow();
  expect((await verifyExperiment(f.context, f.experiment)).length).toBe(2);
  const invalid = structuredClone(f.experiment);
  invalid.routes[0].setupMoves = ['R'];
  await expect(verifyExperiment(f.context, invalid)).rejects.toThrow();
  const wrongScore = structuredClone(f.experiment);
  if (wrongScore.routes[0].score.rated) wrongScore.routes[0].score.cost++;
  await expect(verifyExperiment(f.context, wrongScore)).rejects.toThrow();
});
it('creates fixed distinct A/B identities', () => {
  const [a, b] = f.experiment.routes;
  expect(createComparison(f.experiment, a.id, b.id)).toMatchObject({
    routeAId: a.id,
    routeBId: b.id,
    experimentId: f.experiment.id,
  });
  expect(() => createComparison(f.experiment, a.id, a.id)).toThrow();
  expect(() => createComparison(f.experiment, a.id, 'unknown')).toThrow();
});
