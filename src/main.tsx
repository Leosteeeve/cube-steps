import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';
const PlayerFixture = React.lazy(() => import('./player/PlayerFixture'));
createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV && new URLSearchParams(location.search).get('fixture') === 'player' ? (
    <React.Suspense fallback={<p>Preparing the player fixture…</p>}>
      <PlayerFixture />
    </React.Suspense>
  ) : (
    <App />
  ),
);
