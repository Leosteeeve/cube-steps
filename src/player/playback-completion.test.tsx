// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../core/cube';
import { solveAdvancedCFOP } from '../methods/advanced/solve';
import { solveLBL } from '../methods/lbl/solve';
import { loadAdvancedAssets } from '../methods/advanced/assets';
import { CubePlayer } from './CubePlayer';
import { createCubingAdapter } from './cubing-adapter';
import type { FaceMove } from '../core/types';
vi.mock('./cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
vi.mock('../methods/advanced/assets', () => ({ loadAdvancedAssets: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.mocked(createCubingAdapter).mockRejectedValue(Error('Test text fallback'));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('announces full completion when the final AUF stage is skipped', async () => {
  const engine = await createCubeEngine(),
    assets = {
      crossTable: {
        version: 1 as const,
        goalIndex: 69760,
        distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
      },
    };
  vi.mocked(loadAdvancedAssets).mockResolvedValue(assets);
  // A one-turn input has a nonempty solve and an already solved final layer,
  // independent of which F2L strategy happens to win on a longer scramble.
  const moves: FaceMove[] = ['R'],
    r = solveAdvancedCFOP(engine, engine.apply(engine.solved(), moves), assets);
  if (!r.ok) throw Error(r.message);
  expect(r.trace.stages.at(-1)?.status).toBe('skipped');
  render(
    <CubePlayer engine={engine} session={{ input: { kind: 'scramble', moves }, trace: r.trace }} />,
  );
  await screen.findByRole('alert');
  const range = screen.getByLabelText('Move position');
  fireEvent.change(range, { target: { value: range.getAttribute('max') } });
  expect(screen.getByRole('heading', { name: 'Cube solved.' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Already complete' })).toBeVisible();
  expect(screen.queryByLabelText('Current turn')).not.toBeInTheDocument();
});
it('announces a zero-move solve while retaining skipped-stage teaching', async () => {
  const engine = await createCubeEngine(),
    r = solveLBL(engine, engine.solved());
  if (!r.ok) throw Error(r.message);
  render(
    <CubePlayer
      engine={engine}
      session={{ input: { kind: 'scramble', moves: [] }, trace: r.trace }}
    />,
  );
  await screen.findByRole('alert');
  expect(screen.getByRole('heading', { name: 'Cube solved.' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Already complete' })).toBeVisible();
  expect(screen.queryByLabelText('Current turn')).not.toBeInTheDocument();
});
