// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MotionPreference, MotionProvider } from '../../ui/motion';
import { SectionReveal } from './SectionReveal';

let callback: IntersectionObserverCallback;
const disconnect = vi.fn(),
  cancel = vi.fn();
const animate = vi.fn(() => ({ cancel }));
beforeEach(() => {
  callback = () => {};
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 1200,
    bottom: 1600,
  } as DOMRect);
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as any).animate;
});
function page() {
  return render(
    <MotionProvider edition="club">
      <SectionReveal as="section" aria-label="Practice">
        <a href="#/timer">Open timer</a>
      </SectionReveal>
      <MotionPreference />
    </MotionProvider>,
  );
}
function enter() {
  const target = screen.getByRole('region', { name: 'Practice' });
  act(() =>
    callback(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          time: 0,
          boundingClientRect: new DOMRect(0, 600, 300, 400),
          intersectionRect: new DOMRect(0, 600, 300, 168),
          rootBounds: null,
        },
      ],
      {} as IntersectionObserver,
    ),
  );
}
it('reveals an entering section once without hiding its usable content before entry', () => {
  const view = page();
  expect(screen.getByRole('link', { name: 'Open timer' })).toBeVisible();
  expect(animate).not.toHaveBeenCalled();
  enter();
  expect(animate).toHaveBeenCalledTimes(1);
  const [frames, options] = animate.mock.calls[0] as unknown as [
    Keyframe[],
    KeyframeAnimationOptions,
  ];
  expect(frames[0].transform).toBe('translateY(14px)');
  expect(frames.at(-1)?.opacity).toBe(1);
  expect(Number(options.duration)).toBeLessThanOrEqual(500);
  enter();
  expect(animate).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(disconnect).toHaveBeenCalled();
  expect(cancel).toHaveBeenCalled();
});
it('cancels movement immediately when a link is focused or motion is switched off', () => {
  page();
  enter();
  fireEvent.focus(screen.getByRole('link', { name: 'Open timer' }));
  expect(cancel).toHaveBeenCalled();
  cancel.mockClear();
  fireEvent.change(screen.getByLabelText('Decorative motion'), { target: { value: 'off' } });
  expect(cancel).toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Open timer' })).toBeVisible();
});
it.each(['reduced', 'no-observer', 'already-visible'] as const)(
  'keeps content static for %s',
  (mode) => {
    if (mode === 'reduced')
      vi.stubGlobal('matchMedia', () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      }));
    if (mode === 'no-observer') vi.stubGlobal('IntersectionObserver', undefined);
    if (mode === 'already-visible')
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 400,
      } as DOMRect);
    page();
    expect(screen.getByRole('link', { name: 'Open timer' })).toBeVisible();
    expect(animate).not.toHaveBeenCalled();
  },
);
