// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyzePage } from './AnalyzePage';
import { initialRouxLabSession, reduceRouxLabSession } from './session';
import { rouxLabContext, fixtureRouxRoute } from '../../../tests/helpers/roux-lab-route';
afterEach(cleanup);

async function streamingPage() {
  const { engine, assets } = await rouxLabContext();
  const original = fixtureRouxRoute(engine, assets, 'white-blue');
  const replacement = fixtureRouxRoute(engine, assets, 'white-red');
  const state = {
    ...initialRouxLabSession(),
    input: original.input,
    routes: [original],
    status: 'searching' as const,
  };
  const onCompare = vi.fn(),
    onSelect = vi.fn();
  const page = (next = state) => (
    <AnalyzePage
      engine={engine}
      state={next}
      onStart={() => {}}
      onEdit={() => {}}
      onFrames={() => {}}
      onSelect={onSelect}
      onCompare={onCompare}
    />
  );
  const result = render(page());
  return { ...result, original, replacement, state, page, onCompare, onSelect };
}

it('keeps a pressed route mounted through a stream replacement and compares that exact snapshot', async () => {
  const view = await streamingPage();
  const pressed = screen.getByRole('button', { name: 'Compare this route' });
  fireEvent.pointerDown(pressed, { pointerId: 1 });
  view.rerender(view.page({ ...view.state, routes: [view.replacement] }));
  expect(pressed).toBeInTheDocument();
  expect(view.onCompare).not.toHaveBeenCalled();
  fireEvent.pointerUp(pressed, { pointerId: 1 });
  fireEvent.click(pressed);
  expect(view.onCompare).toHaveBeenCalledExactlyOnceWith(view.original.id, view.original);
  expect(
    screen.getByRole('button', { name: 'Compare this route' }).closest('article'),
  ).toHaveAttribute('data-roux-route', view.replacement.id);
});

it('preserves focused keyboard actions until focus leaves the route list', async () => {
  const view = await streamingPage();
  const button = screen.getByRole('button', { name: 'Play full solve' });
  fireEvent.focus(button);
  view.rerender(view.page({ ...view.state, routes: [view.replacement] }));
  expect(button).toBeInTheDocument();
  fireEvent.click(button);
  expect(view.onSelect).toHaveBeenCalledExactlyOnceWith(view.original.id, view.original);
  fireEvent.blur(button, { relatedTarget: document.body });
  expect(
    screen.getByRole('button', { name: 'Play full solve' }).closest('article'),
  ).toHaveAttribute('data-roux-route', view.replacement.id);
});

it('keeps keyboard focus on the refresh control through repeated streamed updates', async () => {
  const user = userEvent.setup();
  const view = await streamingPage();
  await user.click(screen.getByRole('button', { name: 'Compare this route' }));
  view.rerender(view.page({ ...view.state, routes: [view.replacement] }));
  const refresh = screen.getByRole('button', { name: 'Show latest routes' });
  await user.tab();
  expect(refresh).toHaveFocus();
  expect(refresh).toHaveAttribute('aria-disabled', 'false');
  expect(
    screen.getByRole('button', { name: 'Compare this route' }).closest('article'),
  ).toHaveAttribute('data-roux-route', view.original.id);
  await user.keyboard('{Enter}');
  expect(refresh).toHaveFocus();
  expect(refresh).toHaveAttribute('aria-disabled', 'true');
  expect(
    screen.getByRole('button', { name: 'Compare this route' }).closest('article'),
  ).toHaveAttribute('data-roux-route', view.replacement.id);
  view.rerender(view.page());
  expect(refresh).toHaveFocus();
  expect(refresh).toHaveAttribute('aria-disabled', 'false');
  await user.keyboard(' ');
  expect(refresh).toHaveFocus();
  await user.tab({ shift: true });
  const compare = screen.getByRole('button', { name: 'Compare this route' });
  expect(compare).toHaveFocus();
  expect(compare.closest('article')).toHaveAttribute('data-roux-route', view.original.id);
});

it('refreshes on keyboard exit without stealing focus from the next control', async () => {
  const user = userEvent.setup();
  const view = await streamingPage();
  const outside = document.createElement('button');
  outside.textContent = 'Following control';
  document.body.append(outside);
  try {
    await user.click(screen.getByRole('button', { name: 'Compare this route' }));
    view.rerender(view.page({ ...view.state, routes: [view.replacement] }));
    await user.tab();
    expect(screen.getByRole('button', { name: 'Show latest routes' })).toHaveFocus();
    await user.tab();
    expect(outside).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Compare this route' }).closest('article'),
    ).toHaveAttribute('data-roux-route', view.replacement.id);
  } finally {
    outside.remove();
  }
});

it('cancels a pointer gesture without activation and drops retained routes when input resets', async () => {
  const view = await streamingPage();
  const button = screen.getByRole('button', { name: 'Compare this route' });
  fireEvent.pointerDown(button, { pointerId: 1 });
  view.rerender(view.page({ ...view.state, routes: [view.replacement] }));
  fireEvent.pointerCancel(button, { pointerId: 1 });
  expect(view.onCompare).not.toHaveBeenCalled();
  const next = screen.getByRole('button', { name: 'Compare this route' });
  expect(next.closest('article')).toHaveAttribute('data-roux-route', view.replacement.id);
  fireEvent.focus(next);
  view.rerender(view.page({ ...view.state, input: { ...view.original.input }, routes: [] }));
  expect(screen.queryByRole('button', { name: 'Compare this route' })).not.toBeInTheDocument();
});

it('releases an abandoned drag outside the cards without selecting a route', async () => {
  const view = await streamingPage();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Compare this route' }));
  view.rerender(view.page({ ...view.state, routes: [view.replacement] }));
  fireEvent.pointerUp(document.body);
  expect(view.onCompare).not.toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: 'Compare this route' }).closest('article'),
  ).toHaveAttribute('data-roux-route', view.replacement.id);
});
it('labels an excluded selected route as a playable reference with current evidence', async () => {
  const { engine, assets } = await rouxLabContext(),
    baseline = fixtureRouxRoute(engine, assets);
  if (!baseline.score.rated) throw Error('Expected a rated fixture');
  const selected = {
    ...baseline,
    id: 'selected-reference',
    basis: 'optimized' as const,
    counts: { ...baseline.counts, first: 8 },
    score: { ...baseline.score, rated: true as const, cost: 1 },
  };
  let state = reduceRouxLabSession(initialRouxLabSession(['white-blue']), {
    type: 'start',
    input: baseline.input,
  });
  state = {
    ...state,
    routes: [baseline, selected],
    selectedId: selected.id,
    coverage: {
      elapsedMs: 20,
      operations: 1,
      entries: 0,
      retainedBytes: 0,
      verifiedRoutes: 2,
      frames: {
        'white-blue': {
          status: 'best-found',
          lowerBound: 1,
          upperBound: 2,
          witness: ['F', 'U'],
          completedDepth: 0,
        },
      },
    },
  };
  render(
    <AnalyzePage
      engine={engine}
      state={state}
      onStart={() => {}}
      onEdit={() => {}}
      onFrames={() => {}}
      onSelect={() => {}}
      onCompare={() => {}}
    />,
  );
  const reference = screen.getByText('PLAYBACK REFERENCE').closest('article')!;
  expect(within(reference).getByRole('button', { name: 'Play full solve' })).toBeEnabled();
  expect(reference).toHaveTextContent('outside the current recommendation window');
  expect(reference).toHaveTextContent('2 STM');
});
