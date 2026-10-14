// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { TutorialProvider, TutorialRouteBoundary, useClubTutorial } from './TutorialProvider';
import { TourEntry } from './TourEntry';
import { useGuidanceTarget } from '../../ui/guidance';
import { TUTORIAL_KEY } from './storage';
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function Page({ ready = true, duplicate = false }: { ready?: boolean; duplicate?: boolean }) {
  const ref = useGuidanceTarget('home.start', ready),
    other = useGuidanceTarget('home.start');
  return (
    <>
      <TourEntry tourId="home" ready={ready} />
      <button ref={ref}>Start here</button>
      {duplicate && <button ref={other}>Other</button>}
    </>
  );
}
function TestApp({
  ready = true,
  route = 'home',
  duplicate = false,
}: {
  ready?: boolean;
  route?: string;
  duplicate?: boolean;
}) {
  return (
    <TutorialProvider>
      <TutorialRouteBoundary routeKey={route} tourId={route === 'home' ? 'home' : null}>
        <Page ready={ready} duplicate={duplicate} />
      </TutorialRouteBoundary>
    </TutorialProvider>
  );
}
async function settle() {
  await act(() => vi.advanceTimersByTimeAsync(300));
}
it('offers each welcome choice and permits manual replay after never', async () => {
  render(<TestApp />);
  await settle();
  expect(screen.getByRole('dialog', { name: 'Would you like a quick tour?' })).toBeInTheDocument();
  fireEvent.click(screen.getByText("Don't ask again"));
  expect(JSON.parse(localStorage.getItem(TUTORIAL_KEY)!).welcome).toBe('never');
  expect(screen.queryByText('Show me this page')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Page tour' }));
  expect(screen.getByRole('dialog', { name: 'A small first step' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Exit tour' }));
  await settle();
  expect(screen.getByRole('button', { name: 'Page tour' })).toHaveFocus();
});
it('Not now becomes a quiet reminder on later visits', async () => {
  const v = render(<TestApp />);
  await settle();
  fireEvent.click(screen.getByText('Not now'));
  v.unmount();
  render(<TestApp />);
  await settle();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Show me this page')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss page invitation' }));
  expect(screen.queryByText('Show me this page')).not.toBeInTheDocument();
});
it('does not steal focus when readiness arrives after interaction', async () => {
  const v = render(<TestApp ready={false} />);
  fireEvent.pointerDown(screen.getByText('Start here'));
  v.rerender(<TestApp />);
  await settle();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Show me this page')).toBeInTheDocument();
});
it('starts from welcome, ignores nested modals, and exits on a route change', async () => {
  const v = render(<TestApp />);
  await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
  expect(screen.getByRole('dialog', { name: 'A small first step' })).toBeInTheDocument();
  v.rerender(<TestApp route="unknown" />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  v.unmount();
  localStorage.clear();
  const modal = document.createElement('dialog');
  modal.open = true;
  document.body.append(modal);
  render(<TestApp />);
  await settle();
  expect(screen.queryByText('Would you like a quick tour?')).not.toBeInTheDocument();
  modal.remove();
});
it('recovers duplicate and absent targets only for the active step after a bounded wait', async () => {
  localStorage.setItem(
    TUTORIAL_KEY,
    JSON.stringify({ version: 1, welcome: 'never', dismissed: {}, tours: {} }),
  );
  const v = render(<TestApp duplicate />);
  fireEvent.click(screen.getByRole('button', { name: 'Page tour' }));
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(screen.getByText(/This control is not available/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Skip step' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Exit tour' })).toBeEnabled();
  v.rerender(<TestApp />);
  expect(screen.queryByText(/This control is not available/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(screen.getByText(/This control is not available/)).toBeInTheDocument();
});
it('checks guards and locks synchronously for welcome and retains the lock into the tour', async () => {
  const lock = vi.fn();
  let allowed = true;
  function Guard() {
    const api = useClubTutorial();
    useEffect(() => api.registerGuard(() => allowed), [api.registerGuard]);
    useEffect(() => api.registerInputLock(lock), [api.registerInputLock]);
    return <Page />;
  }
  render(
    <TutorialProvider>
      <TutorialRouteBoundary routeKey="home" tourId="home">
        <Guard />
      </TutorialRouteBoundary>
    </TutorialProvider>,
  );
  await settle();
  expect(lock).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
  expect(lock.mock.calls.map((x) => x[0])).toEqual([false, true]);
  fireEvent.click(screen.getByRole('button', { name: 'Exit tour' }));
  expect(lock).toHaveBeenLastCalledWith(false);
  allowed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Page tour' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
