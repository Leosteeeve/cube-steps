// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TutorialProvider, TutorialRouteBoundary } from './TutorialProvider';
import { TourEntry } from './TourEntry';
import { useGuidanceAction, useGuidanceTarget } from '../../ui/guidance';
import { TUTORIAL_KEY } from './storage';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('shields explanatory targets but permits only the current hands-on group', async () => {
  vi.useFakeTimers();
  localStorage.setItem(
    TUTORIAL_KEY,
    JSON.stringify({ version: 1, welcome: 'never', dismissed: {}, tours: {} }),
  );
  const clicked = vi.fn();
  function Page() {
    const holding = useGuidanceTarget('moves.holding'),
      faces = useGuidanceTarget('moves.faces'),
      emit = useGuidanceAction();
    return (
      <>
        <TourEntry tourId="moves" />
        <button ref={holding} onClick={clicked}>
          Unrelated action
        </button>
        <button ref={faces} onClick={() => emit({ name: 'notation-base', value: 'U' })}>
          U
        </button>
      </>
    );
  }
  render(
    <TutorialProvider>
      <TutorialRouteBoundary routeKey="moves" tourId="moves">
        <Page />
      </TutorialRouteBoundary>
    </TutorialProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Page tour' }));
  fireEvent.click(screen.getByText('Unrelated action'));
  expect(clicked).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.click(screen.getByText('U'));
  expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  expect(screen.getByRole('dialog', { name: 'Choose the upper face' })).not.toHaveAttribute(
    'aria-modal',
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(screen.getByRole('button', { name: 'Page tour' })).toHaveFocus();
});
