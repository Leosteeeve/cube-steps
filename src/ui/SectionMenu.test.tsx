// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { SectionMenu } from './SectionMenu';

afterEach(cleanup);
const items = [
  { label: 'Moves', href: '#/moves' },
  { label: 'Timer', href: '#/timer' },
];

it('offers arrow-key entry without replacing native Tab navigation', async () => {
  const user = userEvent.setup();
  render(<SectionMenu label="Practice" items={items} currentHref="#/" />);
  const trigger = screen.getByRole('button', { name: 'Practice' });
  trigger.focus();
  await user.keyboard('{Enter}{ArrowDown}');
  expect(screen.getByRole('link', { name: 'Moves' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('link', { name: 'Timer' })).toHaveFocus();
  await user.keyboard('{Escape}{Enter}{ArrowUp}');
  expect(screen.getByRole('link', { name: 'Timer' })).toHaveFocus();
});

it('focuses a pressed link before WebKit can blur the disclosure to its ancestor', async () => {
  const user = userEvent.setup();
  render(<SectionMenu label="Practice" items={items} currentHref="#/" />);
  const trigger = screen.getByRole('button', { name: 'Practice' });
  await user.click(trigger);
  const moves = screen.getByRole('link', { name: 'Moves' });
  expect(fireEvent.mouseDown(moves, { button: 0 })).toBe(false);
  expect(moves).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(moves);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('returns focus to the trigger on Escape and hides the destination list', async () => {
  const user = userEvent.setup();
  render(<SectionMenu label="Practice" items={items} currentHref="#/" />);
  const trigger = screen.getByRole('button', { name: 'Practice' });
  expect(screen.queryByRole('link', { name: 'Timer' })).toBeNull();
  await user.click(trigger);
  await user.tab();
  expect(screen.getByRole('link', { name: 'Moves' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'Timer' })).toBeNull();
});

it('closes on a Back/Forward destination change without stealing focus', async () => {
  const user = userEvent.setup();
  const view = render(
    <>
      <SectionMenu label="Practice" items={items} currentHref="#/moves" />
      <button>Elsewhere</button>
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  expect(screen.getByRole('link', { name: 'Moves' })).toHaveAttribute('aria-current', 'page');
  screen.getByRole('button', { name: 'Elsewhere' }).focus();
  view.rerender(
    <>
      <SectionMenu label="Practice" items={items} currentHref="#/timer" />
      <button>Elsewhere</button>
    </>,
  );
  expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
});

it('keeps native destination links and closes after choosing one or clicking outside', async () => {
  const user = userEvent.setup();
  render(<SectionMenu label="Practice" items={items} currentHref="#/moves" />);
  const trigger = screen.getByRole('button', { name: 'Practice' });
  await user.click(trigger);
  const timer = screen.getByRole('link', { name: 'Timer' });
  expect(timer).toHaveAttribute('href', '#/timer');
  fireEvent.click(timer);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  await user.click(document.body);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
