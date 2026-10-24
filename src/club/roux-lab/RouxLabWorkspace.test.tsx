// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
afterEach(cleanup);
import type { RouxLabOwner } from './owner';
import { RouxLabWorkspace } from './RouxLabWorkspace';
const stubs = vi.hoisted(() => ({
  engine: {},
  prepare: vi.fn(() => ({ fingerprint: 'input', source: { kind: 'scramble', moves: [] } })),
}));
vi.mock('../../app/use-cube-engine', () => ({ useCubeEngine: () => ({ engine: stubs.engine }) }));
vi.mock('../../methods/roux-advanced/input', () => ({ prepareRouxInput: stubs.prepare }));
vi.mock('./AnalyzePage', () => ({
  AnalyzePage: ({
    onStart,
    onEdit,
    onFrames,
  }: {
    onStart: (i: unknown) => void;
    onEdit: () => void;
    onFrames: (ids: string[]) => void;
  }) => (
    <>
      <button onClick={() => onStart({ kind: 'scramble', moves: [] })}>Analyze cube</button>
      <button onClick={onEdit}>Edit input</button>
      <button onClick={() => onFrames(['white-blue'])}>Change frames</button>
    </>
  ),
}));
it.each(['Stop search', 'Edit input', 'Change frames'])(
  'does not start a pending client after %s',
  async (label) => {
    let resolve!: (v: unknown) => void;
    const start = vi.fn(),
      owner = {
        getClient: () =>
          new Promise((r) => {
            resolve = r;
          }),
        dispose: vi.fn(),
      } as unknown as RouxLabOwner;
    render(<RouxLabWorkspace owner={owner} view="analyze" />);
    fireEvent.click(screen.getByText('Analyze cube'));
    await waitFor(() => expect(screen.getByText('Stop search')).toBeVisible());
    fireEvent.click(screen.getByText(label));
    await act(async () => resolve({ start }));
    expect(start).not.toHaveBeenCalled();
  },
);
it('stops an active request on input or settings changes and on unmount', async () => {
  const stop = vi.fn(),
    start = vi.fn(() => ({ stop, done: new Promise(() => {}) })),
    owner = { getClient: async () => ({ start }), dispose: vi.fn() } as unknown as RouxLabOwner;
  const view = render(<RouxLabWorkspace owner={owner} view="analyze" />);
  for (const label of ['Edit input', 'Change frames']) {
    fireEvent.click(screen.getByText('Analyze cube'));
    await waitFor(() => expect(start).toHaveBeenCalled());
    fireEvent.click(screen.getByText(label));
    expect(stop).toHaveBeenCalled();
    start.mockClear();
    stop.mockClear();
  }
  fireEvent.click(screen.getByText('Analyze cube'));
  await waitFor(() => expect(start).toHaveBeenCalled());
  view.unmount();
  expect(stop).toHaveBeenCalledOnce();
});
