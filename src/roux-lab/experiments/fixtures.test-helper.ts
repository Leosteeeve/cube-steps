import { rouxLabContext, fixtureRouxRoute } from '../../../tests/helpers/roux-lab-route';
import { createRouxExperiment } from './snapshots';
import type { RouxAttempt } from './types';
export async function experimentFixture() {
  const context = await rouxLabContext(),
    routes = [
      fixtureRouxRoute(context.engine, context.assets),
      fixtureRouxRoute(context.engine, context.assets, 'yellow-red'),
    ];
  const experiment = createRouxExperiment(
    {
      input: routes[0].input,
      settings: {
        allowedFrames: ['white-blue', 'yellow-red'],
        mode: 'lab',
        modelVersion: 'roux-execution-v1',
      },
      coverage: {
        elapsedMs: 15,
        operations: 10,
        entries: 1,
        retainedBytes: 100,
        verifiedRoutes: 2,
        frames: {},
      },
      routes,
    },
    routes.map((r) => r.id),
    'Practice',
  );
  return { ...context, experiment };
}
export const attemptFixture = (experimentId: string, routeId: string): RouxAttempt => ({
  schemaVersion: 1,
  method: 'roux-advanced',
  id: 'attempt',
  revision: 0,
  previousRevision: null,
  createdAt: '2026-10-24T08:00:00.000Z',
  updatedAt: '2026-10-24T08:00:00.000Z',
  experimentId,
  routeId,
  testerId: 'anonymous',
  timingMethod: 'keyboard',
  endpoint: 'roux-blocks',
  kind: 'measured',
  outcome: 'followed',
  rawMs: 12000,
  setupConfirmed: true,
  holdConfirmed: true,
  interruption: null,
  deletedAt: null,
});
