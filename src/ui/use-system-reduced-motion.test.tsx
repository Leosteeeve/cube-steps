// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSystemReducedMotion } from './use-system-reduced-motion';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('resynchronizes on subscription, follows changes and removes its listener', () => {
  let reduced = false,
    callback = () => {};
  const remove = vi.fn();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, listener: () => void) => {
      callback = listener;
      reduced = true;
    },
    removeEventListener: remove,
  }));
  const { result, unmount } = renderHook(useSystemReducedMotion);
  expect(result.current).toBe(true);
  act(() => {
    reduced = false;
    callback();
  });
  expect(result.current).toBe(false);
  unmount();
  expect(remove).toHaveBeenCalledWith('change', callback);
});
it('works when matchMedia is unsupported', () => {
  vi.stubGlobal('matchMedia', undefined);
  expect(renderHook(useSystemReducedMotion).result.current).toBe(false);
});
