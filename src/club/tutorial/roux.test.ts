// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { TOURS, tourForRoute } from './catalog';
import { createTutorialRuntime } from './runtime';
it('introduces Advanced Roux and keeps Lab tours out of the trial view', () => {
  expect(tourForRoute({ kind: 'learn', method: 'roux-advanced', lessonId: 'intro' }, true)).toBe(
    'advanced-roux',
  );
  expect(tourForRoute({ kind: 'roux-lab', view: 'analyze' }, false)).toBe('roux-lab');
  for (const view of ['compare', 'trials'] as const)
    expect(tourForRoute({ kind: 'roux-lab', view }, false)).toBeNull();
  for (const id of ['advanced-roux', 'roux-lab'] as const)
    expect(TOURS[id].steps.every((s) => !s.action && s.guideSection === id)).toBe(true);
});
it('refuses help while a real trial guard is active and never advances timing on dismissal', () => {
  const r = createTutorialRuntime(() => localStorage);
  r.setRoute('roux-lab', 'roux-lab');
  r.registerEntry('roux-lab', true);
  let timing = true,
    locked = false;
  r.registerGuard(() => !timing);
  r.registerInputLock((v) => (locked = v));
  expect(r.requestStart('roux-lab')).toBe(false);
  expect(locked).toBe(false);
  timing = false;
  expect(r.requestStart('roux-lab')).toBe(true);
  expect(locked).toBe(true);
  r.exit();
  expect(locked).toBe(false);
  r.dispose();
  localStorage.clear();
});
