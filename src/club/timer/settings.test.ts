// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import {
  loadTimerSettings,
  saveTimerSettings,
  resetTimerSettings,
  TIMER_SETTINGS_KEY,
} from './settings';
beforeEach(() => localStorage.clear());
it('defaults inspection off and persists an explicit change', () => {
  expect(loadTimerSettings(() => localStorage)).toEqual({
    value: { version: 1, inspectionEnabled: false },
    available: true,
    writable: true,
  });
  expect(saveTimerSettings(() => localStorage, { version: 1, inspectionEnabled: true })).toBe(true);
  expect(loadTimerSettings(() => localStorage).value.inspectionEnabled).toBe(true);
});
it.each(['broken', '{"version":2,"inspectionEnabled":true}'])(
  'protects incompatible settings until reset: %s',
  (raw) => {
    localStorage.setItem(TIMER_SETTINGS_KEY, raw);
    expect(loadTimerSettings(() => localStorage).writable).toBe(false);
    expect(saveTimerSettings(() => localStorage, { version: 1, inspectionEnabled: true })).toBe(
      false,
    );
    expect(localStorage.getItem(TIMER_SETTINGS_KEY)).toBe(raw);
    expect(resetTimerSettings(() => localStorage)).toBe(true);
    expect(loadTimerSettings(() => localStorage).writable).toBe(true);
  },
);
it('handles unavailable storage without claiming persistence', () => {
  const denied = () => {
    throw new Error('denied');
  };
  expect(loadTimerSettings(denied).available).toBe(false);
  expect(saveTimerSettings(denied, { version: 1, inspectionEnabled: true })).toBe(false);
});
