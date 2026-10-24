// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { createCubeViewStore } from './view-preferences';

beforeEach(() => localStorage.clear());
it('restores the member’s view choice without silently rewriting corrupt storage', () => {
  const store = createCubeViewStore(() => localStorage);
  expect(store.save({ version: 1, background: 'light', showNet: true, showBackFaces: false })).toBe(
    true,
  );
  expect(createCubeViewStore(() => localStorage).load()).toEqual({
    version: 1,
    background: 'light',
    showNet: true,
    showBackFaces: false,
  });
  localStorage.setItem('cubesteps.cube-view.v1', '{bad');
  expect(store.load()).toEqual({
    version: 1,
    background: 'dark',
    showNet: false,
    showBackFaces: false,
  });
  expect(localStorage.getItem('cubesteps.cube-view.v1')).toBe('{bad');
});
it('handles unavailable storage and unsupported or malformed preference records', () => {
  const unavailable = createCubeViewStore(() => {
    throw Error('Blocked');
  });
  expect(unavailable.load().background).toBe('dark');
  expect(
    unavailable.save({ version: 1, background: 'light', showNet: false, showBackFaces: true }),
  ).toBe(false);
  for (const raw of [
    null,
    { version: 2 },
    { version: 1, background: 'red', showNet: false, showBackFaces: false },
    { version: 1, background: 'light', showNet: 'true', showBackFaces: false },
  ]) {
    localStorage.setItem('cubesteps.cube-view.v1', JSON.stringify(raw));
    expect(createCubeViewStore(() => localStorage).load().background).toBe('dark');
  }
});
