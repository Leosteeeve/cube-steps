// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { RouteQuiz } from './RouteQuiz';
import { ClubProgressProvider } from './use-club-progress';
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('supports keyboard completion, Back, explanations and an explicit route change', async () => {
  const user = userEvent.setup();
  render(
    <ClubProgressProvider>
      <RouteQuiz />
    </ClubProgressProvider>,
  );
  const first = screen.getByLabelText('I cannot solve independently yet');
  first.focus();
  await user.keyboard(' ');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(first).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Learn advanced formulas and reduce steps'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Short sessions'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Both'));
  fireEvent.click(screen.getByRole('button', { name: 'Show my route' }));
  expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
    'href',
    '#/learn/notation',
  );
  expect(screen.getByText(/first independent solve/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Change route' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose Advanced CFOP · Preview' }));
  expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
    'href',
    '#/learn/advanced-cfop/intro',
  );
  const saved = JSON.stringify(localStorage);
  expect(saved).not.toContain('ability');
  expect(saved).not.toContain('duration');
});
it('skips to a chooser without guessing answers', () => {
  render(
    <ClubProgressProvider>
      <RouteQuiz />
    </ClubProgressProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Skip questions' }));
  expect(screen.getByRole('heading', { name: 'Choose your starting point' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Choose Beginner CFOP' })).toBeVisible();
});
