import { createRoot } from 'react-dom/client';
import { EditionProvider } from '../app/edition';
import { ClubApp } from './ClubApp';
import '../styles.css';
document.documentElement.dataset.edition = 'club';
createRoot(document.getElementById('root')!).render(
  <EditionProvider edition="club">
    <ClubApp />
  </EditionProvider>,
);
