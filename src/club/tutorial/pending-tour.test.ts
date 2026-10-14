// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { createTutorialRuntime } from './runtime';
import { parseClubRoute } from '../routes';
const key = (href: string) => JSON.stringify(parseClubRoute(href));
it('starts an explicit request only on its ready route and cancels different navigation', () => {
  const r = createTutorialRuntime(() => localStorage);
  r.setRoute(key('#/guide'), 'home');
  r.openTour('#/moves', 'moves', 'start');
  r.offer();
  expect(r.snapshot().run).toBeNull();
  r.setRoute(key('#/moves'), 'moves');
  r.registerEntry('moves', true);
  r.offer();
  expect(r.snapshot().run).toBeNull();
  const node = document.createElement('button');
  document.body.append(node);
  r.bridge.registerTarget('moves.holding', node, true);
  r.offer();
  expect(r.snapshot().run?.tourId).toBe('moves');
  r.exit();
  r.openTour('#/moves', 'moves', 'restart');
  r.setRoute(key('#/timer'), 'timer');
  r.setRoute(key('#/moves'), 'moves');
  r.offer();
  expect(r.snapshot().run).toBeNull();
  node.remove();
  r.dispose();
});
