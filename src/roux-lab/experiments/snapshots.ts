import type { CubeEngine } from '../../core/types';
import type { AdvancedRouxAssets } from '../../methods/roux-advanced/assets';
import {
  isVerifiedRouxRoute,
  validateRouxRouteSteps,
  checkedFirstBlockEvidence,
} from '../../methods/roux-advanced/validate';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import { freezeLabValue } from '../../lab/input';
import type { RouxExperiment, RouxComparison } from './types';
import type { RouxLabSession } from '../../club/roux-lab/session';
import { assertExperiment, demand } from './schema';
import { createRouxSearchBudget } from '../../methods/roux-advanced/budget';
import { drainRouxAsync } from '../../workers/roux-advanced-request';
import type { RouxRoute } from '../types';
export function createRouxExperiment(
  snapshot: Pick<RouxLabSession, 'input' | 'settings' | 'coverage' | 'routes'>,
  selected: readonly string[],
  label?: string,
): RouxExperiment {
  demand(snapshot.input && snapshot.coverage, 'Analyze a cube before saving.');
  demand(
    selected.length >= 1 && selected.length <= 4 && new Set(selected).size === selected.length,
    'Select one to four distinct routes.',
  );
  const routes = selected.map((id) => {
    const r = snapshot.routes.find((r) => r.id === id);
    demand(r && isVerifiedRouxRoute(r), 'Only verified routes can be saved.');
    return r;
  });
  const first = routes[0],
    experiment: RouxExperiment = {
      schemaVersion: 1,
      method: 'roux-advanced',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...(label?.trim() ? { label: label.trim() } : {}),
      input: first.input,
      setupMoves: first.input.setupMoves!,
      settings: snapshot.settings,
      coverage: snapshot.coverage,
      routes,
      versions: first.versions,
    };
  assertExperiment(experiment);
  return freezeLabValue(experiment);
}
export function createRouxComparison(e: RouxExperiment, a: string, b: string): RouxComparison {
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
export async function verifyRouxExperiment(
  engine: CubeEngine,
  raw: RouxExperiment,
  assets: AdvancedRouxAssets,
): Promise<RouxExperiment> {
  assertExperiment(raw);
  const routes: RouxRoute[] = [];
  for (const route of raw.routes) {
    const budget = createRouxSearchBudget('normal');
    routes.push(
      await drainRouxAsync(validateRouxRouteSteps(engine, route, assets, budget), budget, () => {}),
    );
  }
  demand(
    engine.equals(engine.apply(engine.solved(), raw.setupMoves), routes[0].input.initial),
    'Experiment setup witness mismatch.',
  );
  const frames = Object.fromEntries(
    Object.entries(raw.coverage.frames).map(([id, evidence]) => [
      id,
      checkedFirstBlockEvidence(
        engine,
        routes[0].input,
        ROUX_FRAMES.find((f) => f.id === id)!,
        evidence,
        assets,
      ),
    ]),
  );
  return freezeLabValue({ ...structuredClone(raw), routes, coverage: { ...raw.coverage, frames } });
}
export async function verifyExperiment(e: RouxExperiment): Promise<void> {
  const [{ createCubeEngine }, { loadRouxLabAssets }] = await Promise.all([
    import('../../core/cube'),
    import('../browser-assets'),
  ]);
  await verifyRouxExperiment(await createCubeEngine(), e, await loadRouxLabAssets());
}
