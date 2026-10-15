// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { fixtureLabRoute, labContext } from '../../../tests/fixtures/lab-context';
import { prepareLabInput } from '../../lab/input';
import { validateLabRoute } from '../../lab/validate';
import { createLabPlayback } from '../../lab/playback';
import { LabPlayer } from './LabPlayer';
import { createCubingAdapter } from '../../player/cubing-adapter';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
vi.mock('../../player/cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.mocked(createCubingAdapter).mockRejectedValue(Error('Renderer unavailable'));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('keeps instructions and stepping available after renderer failure and cleans the synchronous pause handle', async () => {
  const engine = await createCubeEngine(),
    context = labContext(engine),
    input = prepareLabInput(engine, { kind: 'scramble', moves: seededScramble(1) });
  const route = validateLabRoute(context, input, fixtureLabRoute(engine, input, 'red'), 'current'),
    prepared = createLabPlayback(context, input, route),
    handle = vi.fn();
  const view = render(
    <LabPlayer engine={engine} prepared={prepared} route={route} onHandle={handle} />,
  );
  await screen.findByRole('alert');
  expect(screen.getByText(/red bottom/)).toBeVisible();
  expect(screen.getByText(/Exact minimum/)).toBeVisible();
  expect(screen.queryByText(/Shortest cross:/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(screen.getByLabelText('Move position')).toHaveValue('1');
  const f2l = prepared.timeline.sections.find((s) => s.id === 'lab-f2l')!;
  fireEvent.change(screen.getByLabelText('Move position'), { target: { value: f2l.start } });
  expect(screen.getByLabelText('Route section')).toHaveValue('lab-f2l');
  expect(handle.mock.calls.at(-1)![0]).toHaveProperty('pause');
  view.unmount();
  expect(handle).toHaveBeenLastCalledWith(null);
});
