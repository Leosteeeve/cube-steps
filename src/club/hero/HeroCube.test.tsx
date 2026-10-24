// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HeroCube } from './HeroCube';
import { MotionPreference, MotionProvider } from '../../ui/motion';
const frames = new Map<number, FrameRequestCallback>();
let next = 0,
  visible = true,
  reduced = false,
  intersect = (_: IntersectionObserverEntry[]) => {};
const media = new Set<() => void>();
const draw = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  setTransform: vi.fn(),
};
function tick(time: number) {
  act(() => {
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach((f) => f(time));
  });
}
function mount(reveal = true) {
  const view = render(
    <MotionProvider edition="club">
      <HeroCube />
      <MotionPreference />
    </MotionProvider>,
  );
  if (reveal) act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry]));
  return view;
}
beforeEach(() => {
  frames.clear();
  media.clear();
  next = 0;
  visible = true;
  reduced = false;
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    frames.set(++next, f);
    return next;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, f: () => void) => media.add(f),
    removeEventListener: (_: string, f: () => void) => media.delete(f),
  }));
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => !visible);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    draw as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(f: typeof intersect) {
        intersect = f;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('pauses locally, suspends offscreen and avoids a hidden-frame backlog', () => {
  const { unmount } = mount();
  tick(0);
  tick(3000);
  const last = draw.moveTo.mock.calls.at(-1);
  fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
  expect(frames.size).toBe(0);
  tick(9000);
  expect(draw.moveTo.mock.calls.at(-1)).toEqual(last);
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Play motion' }));
  tick(10000);
  expect(draw.moveTo.mock.calls.at(-1)).toEqual(last);
  act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry]));
  expect(frames.size).toBe(0);
  act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry]));
  tick(20000);
  expect(draw.moveTo.mock.calls.at(-1)).toEqual(last);
  act(() => {
    visible = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(frames.size).toBe(0);
  act(() => {
    visible = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  tick(40000);
  expect(draw.moveTo.mock.calls.at(-1)).toEqual(last);
  unmount();
  expect(frames.size).toBe(0);
});
it('waits for the first visibility observation before starting any loop', () => {
  mount(false);
  expect(frames.size).toBe(0);
  act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry]));
  expect(frames.size).toBe(0);
  act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry]));
  expect(frames.size).toBe(1);
});
it('begins static under reduced motion and preserves a manual pause across visibility changes', () => {
  reduced = true;
  mount();
  expect(frames.size).toBe(0);
  expect(screen.queryByRole('button', { name: 'Play motion' })).toBeNull();
  act(() => {
    reduced = false;
    media.forEach((f) => f());
  });
  fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
  act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry]));
  act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry]));
  expect(frames.size).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Play motion' }));
  expect(frames.size).toBe(1);
});
it('resets to the assembled pose and does not offer Play when decoration is disabled', () => {
  mount();
  const assembled = draw.moveTo.mock.calls.at(-1);
  tick(0);
  tick(3000);
  fireEvent.change(screen.getByLabelText('Decorative motion'), { target: { value: 'off' } });
  expect(screen.queryByRole('button', { name: 'Play motion' })).not.toBeInTheDocument();
  expect(screen.getByText('Decorative motion is off.')).toBeVisible();
  expect(draw.moveTo.mock.calls.at(-1)).toEqual(assembled);
  expect(frames.size).toBe(0);
});
it('system reduction overrides animation without persisting a second preference', () => {
  mount();
  act(() => {
    reduced = true;
    media.forEach((f) => f());
  });
  expect(frames.size).toBe(0);
  expect(screen.getByText('Following your reduced-motion setting.')).toBeVisible();
  expect(localStorage.length).toBe(0);
});
it('retains a static vector fallback if canvas is unavailable or fails', () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  mount();
  expect(document.querySelector('img[src*="hero-static"]')).not.toBeNull();
  expect(frames.size).toBe(0);
  expect(screen.queryByRole('button', { name: 'Pause motion' })).not.toBeInTheDocument();
});
it('handles a drawing failure without leaving an animation scheduled', () => {
  draw.fill.mockImplementationOnce(() => {
    throw new Error('drawing unavailable');
  });
  mount();
  expect(document.querySelector('img[src*="hero-static"]')).not.toBeNull();
  expect(frames.size).toBe(0);
});
