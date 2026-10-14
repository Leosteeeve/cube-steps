// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { NotationPlayer } from './NotationPlayer';
import { createNotationAdapter, type NotationRenderer } from './cubing-adapter';
import { GuidanceProvider } from '../../ui/guidance';
vi.mock('./cubing-adapter', () => ({ createNotationAdapter: vi.fn() }));
let engine: CubeEngine,
  reduced = false;
const media = new Set<() => void>();
const adapter = (): NotationRenderer => ({
  durationMs: 1000,
  setProgress: vi.fn(),
  setCamera: vi.fn(),
  dispose: vi.fn(),
});
beforeAll(async () => {
  engine = await createCubeEngine();
});
beforeEach(() => {
  reduced = false;
  media.clear();
  vi.mocked(createNotationAdapter).mockReset().mockResolvedValue(adapter());
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, f: () => void) => media.add(f),
    removeEventListener: (_: string, f: () => void) => media.delete(f),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('wrong move does not complete U prime playback and re-selection is not playback', async () => {
  const emit = vi.fn(),
    bridge = { emit, registerTarget: () => () => {}, registerScope: () => () => {} };
  const v = render(
    <GuidanceProvider bridge={bridge}>
      <NotationPlayer engine={engine} selection={{ base: 'R', amount: '2' }} />
    </GuidanceProvider>,
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled());
  expect(emit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Play move' }));
  expect(emit).toHaveBeenLastCalledWith({ name: 'notation-play', value: 'R2' });
  v.rerender(
    <GuidanceProvider bridge={bridge}>
      <NotationPlayer engine={engine} selection={{ base: 'U', amount: "'" }} />
    </GuidanceProvider>,
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled());
  expect(emit).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
  expect(emit).toHaveBeenLastCalledWith({ name: 'notation-play', value: "U'" });
});
it('does not accept an old selection after the next renderer is ready', async () => {
  let resolveOld!: (v: NotationRenderer) => void;
  const old = adapter(),
    current = adapter();
  vi.mocked(createNotationAdapter)
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveOld = r;
        }),
    )
    .mockResolvedValueOnce(current);
  const { rerender } = render(
    <NotationPlayer engine={engine} selection={{ base: 'U', amount: '' }} />,
  );
  expect(screen.getByRole('button', { name: 'Play move' })).toBeDisabled();
  rerender(<NotationPlayer engine={engine} selection={{ base: 'B', amount: "'" }} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled());
  await act(async () => {
    resolveOld(old);
  });
  expect(old.dispose).toHaveBeenCalled();
  expect(screen.getByLabelText('Selected move')).toHaveTextContent('B′');
});
it('preserves speed and camera mode on selection, pauses on blur and treats camera as observation', async () => {
  const { rerender } = render(
    <NotationPlayer engine={engine} selection={{ base: 'U', amount: '' }} />,
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Move speed'), { target: { value: '0.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Direction view' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play move' }));
  fireEvent(window, new Event('blur'));
  expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled();
  rerender(<NotationPlayer engine={engine} selection={{ base: 'D', amount: '' }} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled());
  expect(screen.getByLabelText('Move speed')).toHaveValue('0.5');
  expect(screen.getByRole('button', { name: 'Direction view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
it('shows actual center colors and honest Before/After fallback on a rendering failure', async () => {
  vi.mocked(createNotationAdapter).mockRejectedValue(new Error('3D unavailable'));
  render(<NotationPlayer engine={engine} selection={{ base: 'x', amount: '' }} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'After' }));
  expect(screen.getByLabelText('Current holding')).toHaveTextContent('green up · yellow front');
  expect(screen.getByRole('img', { name: 'After x' })).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent('3D unavailable');
  expect(screen.getByRole('button', { name: 'Retry animation' })).toBeVisible();
});
it('switches to static endpoints on system reduction and does not automatically play on return', async () => {
  render(<NotationPlayer engine={engine} selection={{ base: 'M', amount: '' }} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play move' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Play move' }));
  act(() => {
    reduced = true;
    media.forEach((f) => f());
  });
  expect(screen.queryByRole('button', { name: 'Pause move' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'After' }));
  expect(screen.getByLabelText('Current holding')).toHaveTextContent('blue up · white front');
  expect(screen.getByRole('img', { name: 'After M' })).toBeVisible();
  act(() => {
    reduced = false;
    media.forEach((f) => f());
  });
  expect(screen.queryByRole('button', { name: 'Pause move' })).not.toBeInTheDocument();
});
it('disposes a renderer that reports a failure before its readiness resolves', async () => {
  const current = adapter();
  let finish!: (value: NotationRenderer) => void;
  vi.mocked(createNotationAdapter).mockImplementationOnce((_host, _demo, options) => {
    queueMicrotask(() => options.onError('Context lost during initialization'));
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  render(<NotationPlayer engine={engine} selection={{ base: 'U', amount: '' }} />);
  await screen.findByRole('alert');
  await act(async () => finish(current));
  expect(current.dispose).toHaveBeenCalled();
  expect(screen.getByRole('img', { name: 'Before U' })).toBeVisible();
});
