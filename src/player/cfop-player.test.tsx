// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_ALGORITHMS } from '../methods/cfop/catalog';
import { invertTeachingMoves } from '../core/teaching-moves';
import { stateToFacelets } from '../core/facelets';
import { flattenTrace } from '../methods/shared/trace';
import { CubePlayer } from './CubePlayer';
import { createCubingAdapter } from './cubing-adapter';
import { seededScramble } from '../../tests/fixtures/lbl-cases';
vi.mock('./cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.mocked(createCubingAdapter).mockRejectedValue(new Error('3D unavailable; textual steps remain usable.'));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows CFOP pair targets, progress and the actual named maneuver', async () => {
  const engine = await createCubeEngine(), result = solveCFOP(engine, engine.apply(engine.solved(), seededScramble(1)));
  if (!result.ok) throw new Error(result.message);
  const range = flattenTrace(result.trace).actions.find(a => a.action.pair?.phase === 'insert')!;
  render(<CubePlayer engine={engine} session={{ input: { kind: 'scramble', moves: seededScramble(1) }, trace: result.trace }} />);
  await screen.findByRole('alert');
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: range.start } });
  expect(screen.getByText('3 × 3 · Beginner CFOP')).toBeVisible();
  expect(screen.getByText(`Pair ${range.action.pair!.ordinal} of 4 · Insert`)).toBeVisible();
  expect(screen.getByText(CFOP_ALGORITHMS[range.action.algorithmId!].name)).toBeVisible();
});
it.each(['oll-edge-dot', 'pll-h', 'pll-z'])('shows the formula and its specific notation or segments: %s', async id => {
  const engine = await createCubeEngine(), initial = engine.apply(engine.solved(), ['x2', ...invertTeachingMoves(CFOP_ALGORITHMS[id].moves), 'x2']);
  const result = solveCFOP(engine, initial); if (!result.ok) throw new Error(result.message);
  const range = flattenTrace(result.trace).actions.find(a => a.action.algorithmId === id)!;
  render(<CubePlayer engine={engine} session={{ input: { kind: 'facelets', facelets: stateToFacelets(initial) }, trace: result.trace }} />);
  await screen.findByRole('alert');
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: range.start } });
  expect(screen.getByText(CFOP_ALGORITHMS[id].name)).toBeVisible();
  if (id === 'oll-edge-dot') {
    expect(screen.getByText('Segment: Make an L')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Move position'), { target: { value: range.start + 6 } });
    expect(screen.getByText('Segment: Align the L')).toBeVisible();
  } else expect(screen.getByText(/M turns the middle slice/)).toBeVisible();
});
