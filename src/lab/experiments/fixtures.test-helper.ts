import { createCubeEngine } from '../../core/cube';
import { prepareLabInput } from '../input';
import { fixtureLabRoute, labContext } from '../../../tests/fixtures/lab-context';
import { validateLabRoute } from '../validate';
import { createExperiment } from './snapshots';
import type { LabClientSnapshot } from '../client';
import type { LabAttempt } from './types';
export async function experimentFixture() {
  const engine = await createCubeEngine(),
    context = labContext(engine);
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'U', 'F'] });
  const routes = (['white', 'yellow'] as const).map((c) =>
    validateLabRoute(context, input, fixtureLabRoute(engine, input, c), 'current'),
  );
  const snapshot: LabClientSnapshot = {
    requestId: 1,
    phase: 'stopped',
    inputFingerprint: input.fingerprint,
    routes,
    settings: { allowedColors: ['white', 'yellow'], modelVersion: 'lab-execution-v1' },
    coverage: {
      elapsedMs: 100,
      operations: 1000,
      colors: {},
      crossCompletions: 2,
      f2lCompletions: 2,
      rejectedCandidates: 0,
      entryHighWater: 100,
      reason: 'cancelled',
    },
  };
  const experiment = createExperiment(
    snapshot,
    routes.map((r) => r.route.id),
  );
  return { engine, context, input, snapshot, experiment };
}
export function attemptFixture(experimentId: string, routeId: string): LabAttempt {
  const now = '2026-10-14T00:00:00.000Z';
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    revision: 0,
    previousRevision: null,
    createdAt: now,
    updatedAt: now,
    experimentId,
    routeId,
    testerId: 'anonymous-test',
    timingMethod: 'keyboard',
    endpoint: 'cross-f2l',
    kind: 'measured',
    outcome: 'followed',
    rawMs: 12000,
    setupConfirmed: true,
    holdConfirmed: true,
    interruption: null,
    deletedAt: null,
  };
}
