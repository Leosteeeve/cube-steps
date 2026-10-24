// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { rouxLabContext, fixtureRouxRoute } from '../../../tests/helpers/roux-lab-route';
import { RouxLabPlayer } from './RouxLabPlayer';
import { createCubingAdapter } from '../../player/cubing-adapter';
import { loadRouxLabAssets } from '../../roux-lab/browser-assets';
vi.mock('../../player/cubing-adapter', () => ({ createCubingAdapter: vi.fn() }));
vi.mock('../../roux-lab/browser-assets', () => ({ loadRouxLabAssets: vi.fn() }));
let context: Awaited<ReturnType<typeof rouxLabContext>>;
beforeAll(async () => {
  context = await rouxLabContext();
});
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.mocked(createCubingAdapter).mockRejectedValue(Error('Renderer unavailable'));
  vi.mocked(loadRouxLabAssets).mockResolvedValue(context.assets);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('keeps a stable prepared source, restores hold on route switch and exposes the block endpoint', async () => {
  const a = fixtureRouxRoute(context.engine, context.assets),
    b = fixtureRouxRoute(context.engine, context.assets, 'yellow-red'),
    position = vi.fn();
  const view = render(<RouxLabPlayer engine={context.engine} route={a} onPosition={position} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next move' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(screen.getByLabelText('Move position')).toHaveValue('1');
  view.rerender(<RouxLabPlayer engine={context.engine} route={a} onPosition={position} />);
  expect(screen.getByLabelText('Move position')).toHaveValue('1');
  fireEvent.change(screen.getByLabelText('Route section'), { target: { value: 'ar-cmll' } });
  expect(screen.getByText(/Both blocks complete — the trial endpoint/)).toBeVisible();
  view.rerender(<RouxLabPlayer engine={context.engine} route={b} onPosition={position} />);
  await waitFor(() => expect(screen.getByLabelText('Move position')).toHaveValue('0'));
  expect(screen.getByText(/Roux Lab · yellow bottom.*red left.*Follow/)).toBeVisible();
  expect(position.mock.calls.at(-1)![0].boundaryState).toEqual(b.trace.initial);
});
