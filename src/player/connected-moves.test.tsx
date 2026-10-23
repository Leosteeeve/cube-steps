// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { solveCFOP } from '../methods/cfop/solve';
import { seededScramble } from '../../tests/fixtures/lbl-cases';
import { flattenTrace } from '../methods/shared/trace';
import { CubePlayer } from './CubePlayer';
vi.mock('./cubing-adapter', () => ({
  createCubingAdapter: vi.fn().mockRejectedValue(new Error('Text playback available.')),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('shows the connected sequence separately from its reference formulas and steps through it once', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const engine = await createCubeEngine(),
    moves = seededScramble(4);
  const result = solveCFOP(engine, engine.apply(engine.solved(), moves));
  if (!result.ok) throw Error(result.message);
  const range = flattenTrace(result.trace).actions.find((a) => a.action.kind === 'joined')!;
  expect(range.action.moves).toEqual(['R', "U'", "R'"]);
  render(
    <CubePlayer
      engine={engine}
      session={{ input: { kind: 'scramble', moves }, trace: result.trace }}
    />,
  );
  await screen.findByRole('alert');
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: range.start } });
  expect(screen.getByRole('heading', { name: 'Connect the moves' })).toBeVisible();
  expect(screen.getByText('Connected moves')).toBeVisible();
  fireEvent.click(screen.getByText('Why these steps are connected'));
  expect(screen.getByText(/Reference only.*do not perform these again/)).toBeVisible();
  expect(screen.getByText('R U R′')).toBeVisible();
  expect(screen.getByText('R U2 R′')).toBeVisible();
  expect(screen.getByLabelText('Current turn')).toHaveTextContent('R');
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(screen.getByLabelText('Current turn')).toHaveTextContent("U'");
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(screen.getByLabelText('Current turn')).toHaveTextContent("R'");
  expect(screen.getByRole('button', { name: /Replay connected moves/ })).toBeVisible();
});
