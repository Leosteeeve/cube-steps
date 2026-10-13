import { createRoot } from 'react-dom/client';
import { EditionProvider } from '../app/edition';
import { ClubApp } from './ClubApp';
import { ClubProgressProvider } from './learning/use-club-progress';
import '../styles.css';
import './club.css';
document.documentElement.dataset.edition = 'club';
createRoot(document.getElementById('root')!).render(
  <EditionProvider edition="club">
    <ClubProgressProvider>
      <ClubApp />
    </ClubProgressProvider>
  </EditionProvider>,
);
