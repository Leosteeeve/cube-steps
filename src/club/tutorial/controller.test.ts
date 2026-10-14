import { describe, expect, it } from 'vitest';
import { TOURS, tourForRoute } from './catalog';
import { createTourController } from './controller';
import { defaultPreferences } from './storage';

describe('tour controller', () => {
  it('resumes only an existing step in the current content version', () => {
    const id = TOURS.moves.steps[2].id;
    for (const [contentVersion, nextStepId, expected] of [
      [1, id, id],
      [0, id, TOURS.moves.steps[0].id],
      [1, 'removed', TOURS.moves.steps[0].id],
    ] as const) {
      const c = createTourController(TOURS, {
        ...defaultPreferences(),
        welcome: 'later',
        tours: { moves: { contentVersion, nextStepId, completed: false } },
      });
      c.start('moves', 'resume');
      expect(c.snapshot().run?.stepId).toBe(expected);
      expect(c.snapshot().preferences.welcome).toBe('started');
    }
  });
  it('completed replay stays completed', () => {
    const c = createTourController(TOURS, defaultPreferences());
    c.start('home', 'start');
    for (const _ of TOURS.home.steps) c.skip();
    expect(c.snapshot().run).toBeNull();
    expect(c.snapshot().preferences.tours.home?.completed).toBe(true);
    c.start('home', 'restart');
    c.skip();
    c.exit();
    expect(c.snapshot().preferences.tours.home?.completed).toBe(true);
  });
  it('rejects stale and mismatched actions', () => {
    const c = createTourController(TOURS, defaultPreferences());
    c.start('moves', 'start');
    const original = c.snapshot().run!;
    c.skip();
    const current = c.snapshot().run!;
    c.action(original.token, { name: 'notation-select', value: "U'" });
    expect(c.snapshot().run).toEqual(current);
    expect(current.token).not.toBe(original.token);
    const step = TOURS.moves.steps.find((s) => s.id === current.stepId)!;
    expect(step.action).toEqual({ name: 'notation-base', value: 'U' });
    c.action(current.token, step.action!);
    expect(c.snapshot().run?.status).toBe('waiting');
    c.target(current.token, 'ready');
    c.next();
    expect(c.snapshot().run?.stepId).toBe(current.stepId);
    c.action(current.token, { name: 'notation-base', value: 'R' });
    expect(c.snapshot().run?.status).toBe('ready');
    c.action(current.token, step.action!);
    expect(c.snapshot().run).toMatchObject({ status: 'done', stepId: current.stepId });
    c.target(current.token, 'ready');
    expect(c.snapshot().run?.status).toBe('done');
    c.next();
    expect(c.snapshot().run?.stepId).not.toBe(current.stepId);
  });
  it('skips missing targets and invalidates tokens on exit and restart', () => {
    const c = createTourController(TOURS, defaultPreferences());
    c.start('moves', 'start');
    const token = c.snapshot().run!.token;
    c.target(token, 'unavailable');
    c.skip();
    c.back();
    c.exit();
    c.target(token, 'ready');
    expect(c.snapshot().run).toBeNull();
    c.start('moves', 'resume');
    expect(c.snapshot().run!.token).toBeGreaterThan(token);
  });
  it('dismissal is separate from completion and never revokes never', () => {
    const c = createTourController(TOURS, { ...defaultPreferences(), welcome: 'never' });
    c.dismiss('moves');
    expect(c.snapshot().preferences.tours.moves).toBeUndefined();
    c.start('moves', 'start');
    expect(c.snapshot().preferences.welcome).toBe('never');
  });
});
it('maps real routes and defines short tours with unique steps', () => {
  expect(tourForRoute({ kind: 'not-found' }, false)).toBeNull();
  expect(tourForRoute({ kind: 'learn', method: 'lbl', lessonId: 'notation' }, false)).toBe(
    'lesson-intro',
  );
  expect(tourForRoute({ kind: 'learn', method: 'cfop-advanced', lessonId: 'f2l' }, true)).toBe(
    'lesson-player',
  );
  for (const tour of Object.values(TOURS)) {
    expect(tour.steps.length).toBeGreaterThanOrEqual(3);
    expect(tour.steps.length).toBeLessThanOrEqual(6);
    expect(new Set(tour.steps.map((s) => s.id)).size).toBe(tour.steps.length);
  }
});
