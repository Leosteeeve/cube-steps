import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';
import './ui/workspace.css';
import { MotionProvider } from './ui/motion';
document.documentElement.dataset.edition = 'global';
const PlayerFixture = import.meta.env.DEV
  ? React.lazy(() => import('./player/PlayerFixture'))
  : null;
const NotationFixture = import.meta.env.DEV
  ? React.lazy(() => import('./club/moves/NotationFixture'))
  : null;
createRoot(document.getElementById('root')!).render(
  NotationFixture && new URLSearchParams(location.search).get('fixture') === 'notation' ? (
    <React.Suspense fallback={<p>Preparing the notation fixture…</p>}>
      <NotationFixture />
    </React.Suspense>
  ) : PlayerFixture && new URLSearchParams(location.search).get('fixture') === 'player' ? (
    <React.Suspense fallback={<p>Preparing the player fixture…</p>}>
      <PlayerFixture />
    </React.Suspense>
  ) : (
    <MotionProvider edition="global">
      <App />
    </MotionProvider>
  ),
);
