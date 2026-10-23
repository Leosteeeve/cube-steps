// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { solveCFOP } from '../methods/cfop/solve';
import { seededScramble } from '../../tests/fixtures/lbl-cases';
import { flattenTrace } from '../methods/shared/trace';
import { CubePlayer } from './CubePlayer';
import { readFileSync } from 'node:fs';
import { solveAdvancedCFOP } from '../methods/advanced/solve';
import type { FaceMove } from '../core/types';
vi.mock('./cubing-adapter', () => ({
  createCubingAdapter: vi.fn().mockRejectedValue(new Error('Text playback available.')),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('shows both pair numbers when a connected sequence spans different Advanced F2L targets', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const engine = await createCubeEngine();
  const distances = new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(distances)));
  const moves = "R U R' F2 D L2 U' B R2 D' F U2 L' B2 R F' D2 L U B'".split(' ') as FaceMove[];
  const result = solveAdvancedCFOP(engine, engine.apply(engine.solved(), moves), {
    crossTable: {
      version: 1,
      goalIndex: 69760,
      distances,
    },
  });
  if (!result.ok) throw Error(result.message);
  const range = flattenTrace(result.trace).actions.find(
    (a) =>
      a.action.joined &&
      new Set(a.action.joined.sources.flatMap((s) => (s.pair ? [s.pair.ordinal] : []))).size > 1,
  )!;
  expect(range.action.pair).toBeUndefined();
  render(
    <CubePlayer
      engine={engine}
      session={{ input: { kind: 'scramble', moves }, trace: result.trace }}
    />,
  );
  await screen.findByRole('alert');
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: range.start } });
  expect(
    screen.getByRole('heading', { name: /Pair 1 of 4.*Pair 2 of 4.*Connected sequence/ }),
  ).toBeVisible();
  expect(screen.getByText(/0 complete before this sequence; 2 after/)).toBeVisible();
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
