// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { solveLBL } from '../methods/lbl/solve';
import { CubePlayer } from './CubePlayer';
vi.mock('./cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
afterEach(cleanup);
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
