// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { solveLBL } from '../methods/lbl/solve';
import { CubePlayer } from './CubePlayer';
import { createCubingAdapter } from './cubing-adapter';
vi.mock('./cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('keeps verified 2D stepping available when 3D initialization never finishes', async () => {
  const engine = await createCubeEngine();
  const moves = ['R'] as const;
  const result = solveLBL(engine, engine.apply(engine.solved(), moves));
  if (!result.ok) throw Error(result.message);
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.mocked(createCubingAdapter).mockImplementation(() => new Promise(() => {}));
  render(
    <CubePlayer
      engine={engine}
      session={{ input: { kind: 'scramble', moves: [...moves] }, trace: result.trace }}
    />,
  );
  await act(async () => {
    vi.advanceTimersByTime(8001);
  });
  expect(screen.queryByRole('img', { name: /Six-face view/ })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next move' })).toBeEnabled();
});
it('shows an initialization error without crashing or waiting forever for invalid provenance', async () => {
  const engine = await createCubeEngine(),
    result = solveLBL(engine, engine.apply(engine.solved(), ['R']));
  if (!result.ok) throw new Error(result.message);
  render(
    <CubePlayer
      engine={engine}
      session={{ input: { kind: 'scramble', moves: [] }, trace: result.trace }}
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('initial input does not match');
  expect(screen.queryByText('Preparing the cube…')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
});
