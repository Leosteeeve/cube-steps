import { createRoot } from 'react-dom/client';
import { EditionProvider } from '../app/edition';
import { ClubApp } from './ClubApp';
import { ClubProgressProvider } from './learning/use-club-progress';
import '../styles.css';
import './club.css';
import '../ui/workspace.css';
import { MotionProvider } from '../ui/motion';
import { TutorialProvider } from './tutorial/TutorialProvider';
document.documentElement.dataset.edition = 'club';
createRoot(document.getElementById('root')!).render(
  <EditionProvider edition="club">
    <MotionProvider edition="club">
      <ClubProgressProvider>
        <TutorialProvider>
          <ClubApp />
        </TutorialProvider>
      </ClubProgressProvider>
    </MotionProvider>
  </EditionProvider>,
);
