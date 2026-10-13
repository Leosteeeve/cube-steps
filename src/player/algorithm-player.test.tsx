// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { getCaseFixture } from '../algorithms/fixtures';
import { createDemonstration } from '../algorithms/demonstration';
import { AlgorithmPlayer } from './AlgorithmPlayer';
import { createCubingAdapter } from './cubing-adapter';
vi.mock('./cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.mocked(createCubingAdapter).mockRejectedValue(
    new Error('3D unavailable; textual steps remain usable.'),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('plays_a_partial_clip_with_text_fallback_and_cleans_up_changed_demo', async () => {
  const engine = await createCubeEngine(),
    demo = createDemonstration(engine, getCaseFixture('oll-45/u0')!, 'oll-45/main');
  const view = render(<AlgorithmPlayer engine={engine} demonstration={demo} />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Next move' })).toBeEnabled();
  const total = demo.actions.flatMap((a) => a.moves).length;
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: total } });
  expect(screen.getByRole('heading', { name: 'Algorithm complete.' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Cube solved.' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Replay formula/ })).toBeEnabled();
  const next = createDemonstration(engine, getCaseFixture('pll-z/u0')!, 'pll-z/main');
  view.rerender(<AlgorithmPlayer engine={engine} demonstration={next} />);
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Move position')).toHaveValue('0');
  expect(screen.queryByRole('heading', { name: 'Algorithm complete.' })).not.toBeInTheDocument();
});
