// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GuidePage } from './GuidePage';
import { GuideImage } from './GuideImage';
import { TutorialProvider } from '../tutorial/TutorialProvider';
import { GUIDE_CHAPTERS } from './chapters';
import acceptedFilm from '../../../docs/media/roux-refresh/film-manifest.json';
afterEach(cleanup);
it('waits for an explicit watch action and preserves written help when the accepted film fails', () => {
  render(
    <TutorialProvider>
      <GuidePage />
    </TutorialProvider>,
  );
  expect(document.querySelector('video')).toBeNull();
  const download = screen.getByRole('link', {
    name: `Download video (${Math.round(acceptedFilm.bytes / 1_000_000)} MB)`,
  });
  expect(download).toHaveAttribute('href', expect.stringMatching(/club-guide-video-v3\.mp4$/));
  expect(download).toHaveAttribute('download', 'Webb-Cubing-Club-Guide-Roux-Refresh.mp4');
  const watch = screen.getByRole('button', { name: 'Watch the 5-minute guide' });
  expect(watch.querySelector('img')).toHaveAttribute(
    'src',
    expect.stringMatching(/poster-v3\.webp$/),
  );
  fireEvent.click(watch);
  const video = document.querySelector('video')!;
  expect(video).toHaveAttribute('src', download.getAttribute('href'));
  expect(video).toHaveAttribute('preload', 'none');
  expect(video).toHaveAttribute('playsinline');
  fireEvent.error(video);
  expect(screen.getByRole('status')).toHaveTextContent('follow the written guide below');
  expect(download).toBeInTheDocument();
  for (const chapter of GUIDE_CHAPTERS)
    expect(screen.getByRole('heading', { name: chapter.title })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Origami — Scott Buckley' })).toHaveAttribute(
    'href',
    'https://www.scottbuckley.com.au/library/origami/',
  );
});
it('opens Roux help with separate lessons and solver links', () => {
  render(
    <TutorialProvider>
      <GuidePage section={'roux' as never} />
    </TutorialProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Build with Beginner Roux' })).toHaveFocus();
  expect(screen.getByRole('link', { name: /Open Beginner Roux/ })).toHaveAttribute(
    'href',
    '#/learn/roux/intro',
  );
  expect(screen.getByRole('link', { name: /Solve with Beginner Roux/ })).toHaveAttribute(
    'href',
    '#/solve/roux',
  );
});
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
