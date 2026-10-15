// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { TOURS, tourForRoute } from './catalog';
import { createTutorialRuntime } from './runtime';
afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});
it('keeps the Lab introduction on Analyze with five informational targets', () => {
  expect(tourForRoute({ kind: 'lab', view: 'analyze' }, false)).toBe('lab');
  expect(tourForRoute({ kind: 'lab', view: 'compare' }, false)).toBeNull();
  expect(tourForRoute({ kind: 'lab', view: 'trials' }, false)).toBeNull();
  expect(TOURS.lab.steps.map((s) => s.targetId)).toEqual([
    'lab.input',
    'lab.colors',
    'lab.progress',
    'lab.recommendation',
    'lab.comparison',
  ]);
  expect(TOURS.lab.steps.every((s) => !s.action && s.guideSection === 'lab')).toBe(true);
});
it('waits for live targets and honors a trial guard and the shared input lock', () => {
  const r = createTutorialRuntime(() => localStorage),
    lock = vi.fn();
  r.setRoute('lab', 'lab');
  r.registerEntry('lab', true);
  r.registerInputLock(lock);
  let timing = true;
  r.registerGuard(() => !timing);
  expect(r.requestStart('lab')).toBe(false);
  timing = false;
  expect(r.requestStart('lab')).toBe(true);
  expect(r.snapshot().run?.status).toBe('waiting');
  expect(lock).toHaveBeenLastCalledWith(true);
  expect(r.getTarget('lab.input')).toBeNull();
  const node = document.createElement('section');
  document.body.append(node);
  const remove = r.bridge.registerTarget('lab.input', node, true);
  expect(r.getTarget('lab.input')).toBe(node);
  remove();
  expect(r.getTarget('lab.input')).toBeNull();
  r.exit();
  expect(lock).toHaveBeenLastCalledWith(false);
  r.dispose();
});
