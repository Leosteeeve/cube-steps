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
  fireEvent.click(screen.getByLabelText('I would rather remember fewer sequences'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(
    screen.getByLabelText('I like figuring out why moves work and trying my own ideas'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Explore more techniques and use fewer moves'));
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
  expect(screen.getByText(/once you can solve independently/i)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Change route' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose Advanced CFOP · Preview' }));
  expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
    'href',
    '#/learn/advanced-cfop/intro',
  );
  const saved = JSON.stringify(localStorage);
  expect(saved).not.toContain('ability');
  expect(saved).not.toContain('duration');
  expect(saved).not.toContain('memorization');
  expect(saved).not.toContain('understanding');
});
it('lets independent solvers choose a conceptual route without knowing a method name', () => {
  render(
    <ClubProgressProvider>
      <RouteQuiz />
    </ClubProgressProvider>,
  );
  for (const answer of [
    'I can solve the whole cube on my own',
    'I would rather remember fewer sequences',
    'I like figuring out why moves work and trying my own ideas',
    'None of these yet, or I am not sure',
    'Understand and execute more smoothly',
    'Short sessions',
  ]) {
    fireEvent.click(screen.getByLabelText(answer));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
  fireEvent.click(screen.getByLabelText('Both'));
  fireEvent.click(screen.getByRole('button', { name: 'Show my route' }));
  expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
    'href',
    '#/learn/roux/intro',
  );
});
it('discards advanced readiness when going back and changing to a new solver', () => {
  render(
    <ClubProgressProvider>
      <RouteQuiz />
    </ClubProgressProvider>,
  );
  for (const answer of [
    'I can solve the whole cube on my own',
    'I enjoy learning and remembering move sequences',
    'I prefer clear steps to follow, with explanations along the way',
    'I solve the first two layers as corner-and-edge pairs, then finish the top in four stages',
  ]) {
    fireEvent.click(screen.getByLabelText(answer));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  fireEvent.click(screen.getByLabelText('I cannot solve independently yet'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Explore more techniques and use fewer moves'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Short sessions'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByLabelText('Both'));
  fireEvent.click(screen.getByRole('button', { name: 'Show my route' }));
  expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
    'href',
    '#/learn/notation',
  );
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
  fireEvent.click(screen.getByRole('button', { name: 'Choose Beginner Roux · Preview' }));
  expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
    'href',
    '#/learn/roux/intro',
  );
});
