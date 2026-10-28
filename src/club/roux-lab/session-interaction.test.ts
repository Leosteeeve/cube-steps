import { expect, it } from 'vitest';
import { fixtureRouxRoute, rouxLabContext } from '../../../tests/helpers/roux-lab-route';
import { initialRouxLabSession, reduceRouxLabSession } from './session';

it('pins the verified route the user saw even after it leaves the current recommendation window', async () => {
  const { engine, assets } = await rouxLabContext();
  const a = fixtureRouxRoute(engine, assets, 'white-blue');
  const b = fixtureRouxRoute(engine, assets, 'white-red');
  let state = reduceRouxLabSession(initialRouxLabSession(), { type: 'start', input: a.input });
  state = { ...state, routes: [b] };
  state = reduceRouxLabSession(state, { type: 'compare', id: a.id, route: a });
  expect(state.comparisonA).toBe(a);
  state = reduceRouxLabSession(state, { type: 'compare', id: b.id, route: b });
  expect(state.comparison?.A).toBe(a);
  expect(state.comparison?.B).toBe(b);
});

it('rejects retained comparisons from other inputs, disallowed frames and unverified clones', async () => {
  const { engine, assets } = await rouxLabContext();
  const a = fixtureRouxRoute(engine, assets);
  const otherInput = fixtureRouxRoute(engine, assets, 'white-blue', ['F']);
  const otherFrame = fixtureRouxRoute(engine, assets, 'white-red');
  const state = reduceRouxLabSession(initialRouxLabSession(['white-blue']), {
    type: 'start',
    input: a.input,
  });
  for (const route of [otherInput, otherFrame, { ...a }]) {
    expect(reduceRouxLabSession(state, { type: 'compare', id: route.id, route })).toBe(state);
  }
  expect(reduceRouxLabSession(state, { type: 'compare', id: 'wrong-id', route: a })).toBe(state);
});
