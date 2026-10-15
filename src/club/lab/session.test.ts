import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { labContext, fixtureLabRoute } from '../../../tests/fixtures/lab-context';
import { prepareLabInput } from '../../lab/input';
import { validateLabRoute, type VerifiedLabRoute } from '../../lab/validate';
import { createLabSession, reduceLabSession, canSaveLabSession } from './session';
let a: VerifiedLabRoute, b: VerifiedLabRoute;
const input = { kind: 'scramble' as const, moves: ['R', 'U', 'F'] as const };
beforeAll(async () => {
  const context = labContext(await createCubeEngine()),
    prepared = prepareLabInput(context.engine, input);
  a = validateLabRoute(context, prepared, fixtureLabRoute(context.engine, prepared), 'current');
  b = validateLabRoute(
    context,
    prepared,
    fixtureLabRoute(context.engine, prepared, 'red'),
    'current',
  );
});
function analyzed() {
  let s = createLabSession();
  s = reduceLabSession(s, { type: 'analyze', input, requestId: 1 });
  return reduceLabSession(s, {
    type: 'candidate-update',
    snapshot: {
      requestId: 1,
      phase: 'searching',
      routes: [a],
      recommendedRouteId: a.route.id,
      inputFingerprint: a.route.inputFingerprint,
    },
  });
}
it('preserves pinned playback, comparisons and drafts across tabs and better recommendations', () => {
  let s = analyzed();
  s = reduceLabSession(s, { type: 'compare', routeId: a.route.id, selected: true });
  s = reduceLabSession(s, { type: 'tab', view: 'compare' });
  s = reduceLabSession(s, {
    type: 'candidate-update',
    snapshot: {
      requestId: 1,
      phase: 'searching',
      routes: [b],
      recommendedRouteId: b.route.id,
      inputFingerprint: b.route.inputFingerprint,
    },
  });
  expect(s.pinnedRouteId).toBe(a.route.id);
  expect(s.comparedRouteIds).toEqual([a.route.id]);
  expect(s.routes[a.route.id]).toBe(a);
  expect(s.snapshot.recommendedRouteId).toBe(b.route.id);
  expect(s.view).toBe('compare');
  expect(canSaveLabSession(s)).toBe(true);
  s = reduceLabSession(s, { type: 'pin', routeId: b.route.id });
  expect(s.pinnedRouteId).toBe(b.route.id);
});
it('invalidates recommendations and pins explicitly after cube edits, while rejecting stale updates', () => {
  let s = analyzed();
  s = reduceLabSession(s, { type: 'edit', text: 'F2' });
  expect(s.invalidated).toBe(true);
  expect(s.routes).toEqual({});
  expect(s.pinnedRouteId).toBeUndefined();
  expect(canSaveLabSession(s)).toBe(false);
  s = reduceLabSession(s, {
    type: 'candidate-update',
    snapshot: { requestId: 1, phase: 'searching', routes: [a] },
  });
  expect(s.routes).toEqual({});
  s = reduceLabSession(s, {
    type: 'analyze',
    input: { kind: 'scramble', moves: ['F2'] },
    requestId: 2,
  });
  s = reduceLabSession(s, {
    type: 'candidate-update',
    snapshot: { requestId: 1, phase: 'error', routes: [] },
  });
  expect(s.snapshot.requestId).toBe(2);
});
it('keeps painting in the session and does not invalidate on selecting a paint color', () => {
  let s = analyzed();
  s = reduceLabSession(s, { type: 'color-draft', action: { type: 'select-color', color: 'red' } });
  expect(s.pinnedRouteId).toBe(a.route.id);
  s = reduceLabSession(s, {
    type: 'color-draft',
    action: { type: 'paint', cell: { face: 'F', index: 0 } },
  });
  expect(s.routes).toEqual({});
  expect(s.draft.colors.draft.facelets.F[0]).toBe('red');
  s = reduceLabSession(s, { type: 'tab', view: 'trials' });
  expect(s.draft.colors.draft.facelets.F[0]).toBe('red');
});
it('opens a saved experiment without requesting a new search or recommending historical routes', () => {
  let s = createLabSession();
  expect(canSaveLabSession(s)).toBe(false);
  s = reduceLabSession(s, {
    type: 'load-experiment',
    experimentId: 'saved-1',
    input,
    routes: [a, b],
    settings: s.settings,
  });
  expect(s.selectedExperimentId).toBe('saved-1');
  expect(s.snapshot.phase).toBe('stopped');
  expect(s.snapshot.recommendedRouteId).toBeUndefined();
  expect(s.pinnedRouteId).toBe(a.route.id);
  expect(reduceLabSession(s, { type: 'compare', routeId: 'foreign', selected: true })).toBe(s);
});
