// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MotionProvider, MotionPreference, useMotion } from './motion';
let reduced = false;
const listeners = new Set<() => void>();
beforeEach(() => {
  localStorage.clear();
  reduced = false;
  listeners.clear();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, f: () => void) => listeners.add(f),
    removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function Probe() {
  const m = useMotion();
  return (
    <>
      <output>{m.enabled ? 'full' : 'reduced'}</output>
      <MotionPreference />
    </>
  );
}
it('resynchronizes a device preference that changes between initial render and subscription', () => {
  let calls = 0;
  vi.stubGlobal('matchMedia', () => ({
    matches: ++calls > 1,
    addEventListener() {},
    removeEventListener() {},
  }));
  render(
    <MotionProvider edition="club">
      <Probe />
    </MotionProvider>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('reduced');
});
it('follows the system while local Off persists independently for each edition', () => {
  const first = render(
    <MotionProvider edition="club">
      <Probe />
    </MotionProvider>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('full');
  act(() => {
    reduced = true;
    listeners.forEach((f) => f());
  });
  expect(screen.getByRole('status')).toHaveTextContent('reduced');
  act(() => {
    reduced = false;
    listeners.forEach((f) => f());
  });
  fireEvent.change(screen.getByLabelText('Decorative motion'), { target: { value: 'off' } });
  expect(screen.getByRole('status')).toHaveTextContent('reduced');
  first.unmount();
  const second = render(
    <MotionProvider edition="club">
      <Probe />
    </MotionProvider>,
  );
  expect(screen.getByLabelText('Decorative motion')).toHaveValue('off');
  second.unmount();
  render(
    <MotionProvider edition="global">
      <Probe />
    </MotionProvider>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('full');
});
it.each(['{', 'null', '{"version":2,"preference":"off"}'])(
  'preserves incompatible preferences until reset: %s',
  (raw) => {
    localStorage.setItem('cubesteps.club.motion.v1', raw);
    render(
      <MotionProvider edition="club">
        <Probe />
      </MotionProvider>,
    );
    fireEvent.change(screen.getByLabelText('Decorative motion'), { target: { value: 'off' } });
    expect(screen.getByRole('status')).toHaveTextContent('reduced');
    expect(localStorage.getItem('cubesteps.club.motion.v1')).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: 'Reset motion preference' }));
    expect(JSON.parse(localStorage.getItem('cubesteps.club.motion.v1')!)).toEqual({
      version: 1,
      preference: 'system',
    });
  },
);
it('continues in memory when storage is denied and suppresses hidden decoration', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('denied');
  });
  render(
    <MotionProvider edition="club">
      <Probe />
    </MotionProvider>,
  );
  expect(screen.getByText(/Motion preference is not saved/)).toBeVisible();
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(document.documentElement.dataset.motion).toBe('reduced');
  delete (document as any).hidden;
});
