import { createRoot } from 'react-dom/client';
import { EditionProvider } from '../app/edition';
import { ClubApp } from './ClubApp';
import '../styles.css';
import './club.css';
document.documentElement.dataset.edition = 'club';
createRoot(document.getElementById('root')!).render(
  <EditionProvider edition="club">
    <ClubApp />
  </EditionProvider>,
);
