import type { LabClientSnapshot } from '../client';
import { freezeLabValue, prepareLabInput } from '../input';
import { isVerifiedLabRoute, validateLabRoute, type VerifiedLabRoute } from '../validate';
import { LAB_CATALOG_VERSION, LAB_SEARCH_VERSION, type LabContext } from '../finalize';
import { assertExperiment, demand, sameLabValue } from './schema';
import type { LabComparison, LabExperiment } from './types';
export function createExperiment(
  snapshot: LabClientSnapshot,
  selectedRouteIds: readonly string[],
  label?: string,
): LabExperiment {
  demand(
    selectedRouteIds.length >= 1 &&
      selectedRouteIds.length <= 4 &&
      new Set(selectedRouteIds).size === selectedRouteIds.length,
    'Select one to four distinct routes.',
  );
  demand(
    snapshot.settings && snapshot.coverage && snapshot.inputFingerprint,
    'No verified analysis to save.',
  );
  const routes = selectedRouteIds.map((id) => {
    const v = snapshot.routes.find((r) => r.route.id === id);
    demand(
      v &&
        isVerifiedLabRoute(v) &&
        v.validationMode === 'current' &&
        v.route.inputFingerprint === snapshot.inputFingerprint,
      'Only current independently verified routes from one input may be saved.',
    );
    return v.route;
  });
  const first = routes[0];
  // Input diagrams use the original standard frame, which the route setup reproduces.
  const e: LabExperiment = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...(label?.trim() ? { label: label.trim() } : {}),
    input: first.input,
    inputFingerprint: first.inputFingerprint,
    setupMoves: first.setupMoves,
    diagramHold: { bottom: 'yellow', front: 'green' },
    settings: snapshot.settings,
    coverage: snapshot.coverage,
    limits: {
      deadlineMs: 30000,
      operations: 2000000,
      entries: 25000,
      crossPerColor: 96,
      beam: 32,
      shortlist: 12,
    },
    appVersion: 'cubesteps-lab-v1',
    modelVersion: first.modelVersion,
    catalogVersion: first.catalogVersion,
    searchVersion: first.searchVersion,
    routes,
  };
  // Facelet entry is normalized into the same center scheme by the existing input contract.
  if (first.input.kind === 'facelets')
    e.diagramHold = { bottom: first.input.facelets.D[4], front: first.input.facelets.F[4] };
  const copy = structuredClone(e);
  assertExperiment(copy);
  return freezeLabValue(copy);
}
export function createComparison(e: LabExperiment, a: string, b: string): LabComparison {
  demand(
    a !== b && [a, b].every((id) => e.routes.some((r) => r.id === id)),
    'Choose two distinct saved routes.',
  );
  return freezeLabValue({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    experimentId: e.id,
    routeAId: a,
    routeBId: b,
    createdAt: new Date().toISOString(),
  });
}
export async function verifyExperiment(
  context: LabContext,
  e: LabExperiment,
): Promise<readonly VerifiedLabRoute[]> {
  assertExperiment(e);
  const input = prepareLabInput(context.engine, e.input);
  demand(
    input.fingerprint === e.inputFingerprint && sameLabValue(input.inputHold, e.diagramHold),
    'Experiment input/holding mismatch.',
  );
  demand(
    context.engine.equals(
      context.engine.apply(context.engine.solved(), e.setupMoves),
      input.initial,
    ),
    'Experiment setup mismatch.',
  );
  const result: VerifiedLabRoute[] = [];
  for (const r of e.routes) {
    const current =
      r.modelVersion === context.profiles.version &&
      r.catalogVersion === LAB_CATALOG_VERSION &&
      r.searchVersion === LAB_SEARCH_VERSION;
    result.push(validateLabRoute(context, input, r, current ? 'current' : 'archive'));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return result;
}
