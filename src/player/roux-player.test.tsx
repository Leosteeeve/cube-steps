// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { beforeAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, SolveSession } from '../core/types';
import { solveRoux } from '../methods/roux/solve';
import { loadTestRouxAssets } from '../../tests/helpers/roux';
import { registerMethodRuntime } from '../methods/registry';
import { ROUX_RUNTIME } from '../methods/roux/definition';
import { ROUX_WORKED_EXAMPLES } from '../content/roux/examples';
import { resolveSolveInput } from '../core/solve-input';
import { CubePlayer } from './CubePlayer';
import { createCubingAdapter } from './cubing-adapter';
import { createSourcePlaybackController } from './controller';
vi.mock('./cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
let engine: CubeEngine, session: SolveSession;
beforeAll(async () => {
  engine = await createCubeEngine();
  registerMethodRuntime(ROUX_RUNTIME);
  const input = ROUX_WORKED_EXAMPLES.find((x) => x.id === 'left-m')!.input;
  const result = solveRoux(engine, resolveSolveInput(engine, input), await loadTestRouxAssets());
  if (!result.ok) throw Error(result.message);
  session = { input, trace: result.trace };
});
beforeEach(() => {
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.mocked(createCubingAdapter).mockRejectedValue(
    Error('3D unavailable; textual steps remain usable.'),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('verifies Roux and keeps every seek, reverse step, replay and stage boundary physical', () => {
  const p = createSourcePlaybackController(engine, { kind: 'solve', session });
  expect(p.timeline.moves.slice(0, 2)).toEqual(['x2', 'y']);
  for (let i = 0; i <= p.timeline.moves.length; i++) {
    p.seekMove(i);
    expect(p.snapshot().boundaryState).toEqual(
      engine.apply(session.trace.initial, p.timeline.moves.slice(0, i)),
    );
    if (i > 0) {
      p.step(-1);
      expect(p.snapshot().boundaryState).toEqual(p.timeline.states[i - 1]);
    }
  }
  for (const section of p.timeline.sections) {
    p.seekSection(section.id);
    expect(p.snapshot().moveIndex).toBe(section.start);
  }
  const ai = p.timeline.actions.findIndex((a) => a.action.kind === 'algorithm');
  p.replayAction(ai);
  expect(p.snapshot().moveIndex).toBe(p.timeline.actions[ai].start);
  p.dispose();
});
it('shows the actual odd-M checkpoint and reverses it under reduced motion', async () => {
  const p = createSourcePlaybackController(engine, { kind: 'solve', session });
  const index = p.timeline.moves.findIndex((m) => m === 'M' || m === "M'");
  expect(index).toBeGreaterThan(1);
  render(<CubePlayer engine={engine} session={session} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next move' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: index + 1 } });
  expect(await screen.findByText(/Middle-slice setup in progress/)).toBeVisible();
  expect(screen.getByLabelText('Current centers')).toHaveTextContent(
    engine.observe(p.timeline.states[index + 1]).centers.U + ' up',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
  expect(screen.getByLabelText('Move position')).toHaveValue(String(index));
  expect(document.querySelector('[data-boundary-state]')).toHaveAttribute(
    'data-boundary-state',
    JSON.stringify(p.timeline.states[index].data),
  );
  p.dispose();
});
