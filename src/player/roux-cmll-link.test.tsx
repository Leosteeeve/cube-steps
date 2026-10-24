// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rouxLabContext, fixtureRouxRoute } from '../../tests/helpers/roux-lab-route';
import { createAdvancedRouxRuntime } from '../methods/roux-advanced/definition';
import { registerAdvancedRouxFrameRuntime, registerMethodPresentation } from '../methods/registry';
import { prepareAdvancedRouxPlayback } from '../methods/roux-advanced/browser-runtime';
import { prepareRouxPlayback } from '../roux-lab/playback';
import { PlaybackView } from './PlaybackView';
import type { PlaybackSource } from './playback-source';
vi.mock('./cubing-adapter', () => ({
  createCubingAdapter: vi.fn().mockRejectedValue(Error('Use 2D')),
}));
vi.mock('../methods/roux-advanced/browser-runtime', () => ({
  prepareAdvancedRouxPlayback: vi.fn(),
}));
let context: Awaited<ReturnType<typeof rouxLabContext>>;
beforeAll(async () => {
  context = await rouxLabContext();
  const runtime = createAdvancedRouxRuntime(context.assets, 'yellow-red');
  registerMethodPresentation(runtime.presentation);
  registerAdvancedRouxFrameRuntime('yellow-red', runtime);
  vi.mocked(prepareAdvancedRouxPlayback).mockResolvedValue(runtime);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
for (const kind of ['solve', 'roux-lab'] as const)
  it(`${kind} links the exact CMLL formula and physical frame`, async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const r = fixtureRouxRoute(context.engine, context.assets, 'yellow-red');
    const source: PlaybackSource =
      kind === 'solve'
        ? { kind, session: { input: r.input.source, trace: r.trace } }
        : { kind, prepared: prepareRouxPlayback(context.engine, r, context.assets) };
    const actions = r.trace.stages.flatMap((s) => s.actions),
      index = actions.findIndex((a) => a.algorithmId?.startsWith('cmll-'));
    expect(index).toBeGreaterThanOrEqual(0);
    const move = actions.slice(0, index).reduce((n, a) => n + a.moves.length, 0),
      action = actions[index];
    render(<PlaybackView engine={context.engine} source={source} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next move' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Move position'), { target: { value: String(move) } });
    expect(
      await screen.findByRole('link', { name: 'Explore this CMLL variant →' }),
    ).toHaveAttribute(
      'href',
      `#/cmll/${action.caseId}?variant=${action.algorithmId}&frame=yellow-red`,
    );
  });
