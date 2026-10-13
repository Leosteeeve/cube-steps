import { useEffect, useState } from 'react';
import { parseClubRoute } from './routes';
import { SharedFeaturePage } from '../app/SharedFeaturePage';
import { useCubeEngine } from '../app/use-cube-engine';
import { getMethod } from '../methods/registry';
import { ClubHeader } from './components/ClubHeader';
import { ClubFooter } from './components/ClubFooter';
import { HomePage } from './HomePage';
import { RouteQuiz } from './learning/RouteQuiz';
import { useClubProgress } from './learning/use-club-progress';
import { lessonRoute } from '../app/routes';
export function ClubApp() {
  const { progress } = useClubProgress();
  const [route, setRoute] = useState(() => parseClubRoute(location.hash));
  useEffect(() => {
    const change = () => setRoute(parseClubRoute(location.hash));
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, []);
  const { engine, error, retry } = useCubeEngine(
    !['home', 'quiz', 'timer', 'not-found'].includes(route.kind),
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <ClubHeader
        active={route.kind === 'home' ? 'home' : route.kind === 'timer' ? 'timer' : 'learn'}
        timerAvailable={false}
      />
      <main id="main" tabIndex={-1}>
        {route.kind === 'home' ? (
          <HomePage
            resumeHref={
              progress.lastLesson
                ? lessonRoute(progress.lastLesson.method, progress.lastLesson.lessonId)
                : undefined
            }
          />
        ) : route.kind === 'quiz' ? (
          <RouteQuiz />
        ) : route.kind === 'timer' ? (
          <section>
            <h1>Timer is being prepared</h1>
            <a href="#/">Back home</a>
          </section>
        ) : route.kind === 'not-found' ? (
          <section>
            <h1>Page not found.</h1>
            <a href="#/">Back home</a>
          </section>
        ) : error ? (
          <section role="alert">
            <p>{error}</p>
            <button onClick={retry}>Retry loading cube</button>
          </section>
        ) : engine ? (
          <>
            {'method' in route && (
              <p className="preview-label">
                {getMethod(route.method).label}
                {getMethod(route.method).teachingStatus === 'preview' ? ' · Preview' : ''}
              </p>
            )}
            <SharedFeaturePage route={route} engine={engine} />
          </>
        ) : (
          <p role="status" className="loading-panel">
            Getting your cube ready…
          </p>
        )}
      </main>
      <ClubFooter />
    </>
  );
}
