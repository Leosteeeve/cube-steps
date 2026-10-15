// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GuidePage } from './GuidePage';
import { GuideImage } from './GuideImage';
import { TutorialProvider } from '../tutorial/TutorialProvider';
import { GUIDE_CHAPTERS } from './chapters';
afterEach(cleanup);
const image = {
  id: 'home',
  src: 'club-guide/home.png',
  alt: 'The home page',
  caption: 'Start here.',
  route: '#/',
  width: 1000,
  height: 700,
  sourceRevision: 'test',
  scenario: 'home',
  exampleData: false,
};
it('renders all written chapters without a cube player', () => {
  render(
    <TutorialProvider>
      <GuidePage />
    </TutorialProvider>,
  );
  for (const c of GUIDE_CHAPTERS)
    expect(screen.getByRole('heading', { name: c.title })).toBeInTheDocument();
  expect(document.querySelector('twisty-player')).toBeNull();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('focuses the Lab deep link and provides a clear Analyze destination', () => {
  render(
    <TutorialProvider>
      <GuidePage section={'lab' as never} />
    </TutorialProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Explore CFOP Lab' })).toHaveFocus();
  expect(screen.getByRole('link', { name: /Open CFOP Lab/ })).toHaveAttribute('href', '#/lab');
});
it('enlarges a screenshot with an accessible close and restores focus; failures keep its caption', () => {
  render(<GuideImage image={image} />);
  const button = screen.getByRole('button', { name: 'Enlarge: Start here.' });
  button.focus();
  fireEvent.click(button);
  expect(screen.getByRole('dialog', { name: 'Start here.' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(button).toHaveFocus();
  fireEvent.error(screen.getByAltText('The home page'));
  expect(screen.getByText('Start here.')).toBeInTheDocument();
  expect(screen.getByText(/Screenshot unavailable/)).toBeInTheDocument();
});
