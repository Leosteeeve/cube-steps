import { lazy, Suspense, useEffect, useState } from 'react';
import { parseClubRoute } from './routes';
import { SharedFeaturePage } from '../app/SharedFeaturePage';
import { useCubeEngine } from '../app/use-cube-engine';
import { getMethodInfo as getMethod } from '../methods/info';
import { ClubHeader } from './components/ClubHeader';
import { ClubFooter } from './components/ClubFooter';
import { HomePage } from './HomePage';
import { RouteQuiz } from './learning/RouteQuiz';
import { useClubProgress } from './learning/use-club-progress';
import { lessonRoute, methodRoute } from '../app/routes';
import { createTimerRepository } from './timer/repository';
import { MoveExplorerRoute } from './moves/MoveExplorerRoute';
import { TutorialRouteBoundary } from './tutorial/TutorialProvider';
import { TourEntry } from './tutorial/TourEntry';
import { tourForRoute } from './tutorial/catalog';
import { createLabOwner } from './lab-owner';
import { createRouxLabOwner } from './roux-lab/owner';
import { SectionMenu } from '../ui/SectionMenu';
const RouxLabWorkspace = lazy(() =>
  import('./roux-lab/RouxLabWorkspace').then((m) => ({ default: m.RouxLabWorkspace })),
);
const TimerPage = lazy(() => import('./timer/TimerPage').then((m) => ({ default: m.TimerPage })));
const AdvancedRouxFeaturePage = lazy(() =>
  import('./roux-advanced/AdvancedRouxFeaturePage').then((m) => ({
    default: m.AdvancedRouxFeaturePage,
  })),
);
const RouxFeaturePage = lazy(() =>
  import('./roux/RouxFeaturePage').then((m) => ({ default: m.RouxFeaturePage })),
);
const GuidePage = lazy(() => import('./guide/GuidePage').then((m) => ({ default: m.GuidePage })));
const LabWorkspace = lazy(() =>
  import('./lab/LabWorkspace').then((m) => ({ default: m.LabWorkspace })),
);
const ClubLearnPage = lazy(() =>
  import('./learning/ClubLearnPage').then((m) => ({ default: m.ClubLearnPage })),
);
export function ClubApp() {
  const [labOwner] = useState(createLabOwner);
  const [rouxLabOwner] = useState(createRouxLabOwner);
  useEffect(() => () => rouxLabOwner.dispose(), [rouxLabOwner]);
  useEffect(() => () => labOwner.dispose(), [labOwner]);
  const [timerRepository] = useState(() => createTimerRepository());
  useEffect(() => () => timerRepository.dispose(), [timerRepository]);
  const { progress } = useClubProgress();
  const [route, setRoute] = useState(() => parseClubRoute(location.hash));
  useEffect(() => {
    const change = () => setRoute(parseClubRoute(location.hash));
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, []);
  const { engine, error, retry } = useCubeEngine(
    !['home', 'quiz', 'guide', 'lab', 'roux-lab', 'not-found'].includes(route.kind),
  );
  const tourId = tourForRoute(
    route,
    route.kind === 'learn' && !['notation', 'intro'].includes(route.lessonId),
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
        active={
          route.kind === 'home'
            ? 'home'
            : route.kind === 'timer'
              ? 'timer'
              : route.kind === 'moves'
                ? 'moves'
                : route.kind === 'guide'
                  ? 'guide'
                  : route.kind === 'lab' || route.kind === 'roux-lab'
                    ? 'lab'
                    : 'learn'
        }
        timerAvailable={true}
      />
      <main id="main" tabIndex={-1}>
        <TutorialRouteBoundary routeKey={JSON.stringify(route)} tourId={tourId}>
          {tourId && !['timer', 'lab', 'roux-lab'].includes(route.kind) && (
            <TourEntry
              tourId={tourId}
              ready={route.kind === 'home' || route.kind === 'quiz' || !!engine}
            />
          )}
          {!['home', 'quiz', 'timer', 'moves', 'guide', 'lab', 'roux-lab', 'not-found'].includes(
            route.kind,
          ) && (
            <nav className="club-tools" aria-label="Learning tools">
              <a
                aria-current={route.kind === 'learn' ? 'page' : undefined}
                href={methodRoute(
                  'method' in route ? route.method : progress.selectedMethod,
                  'learn',
                )}
              >
                Lessons
              </a>
              <a
                aria-current={route.kind === 'solve' ? 'page' : undefined}
                href={methodRoute(
                  'method' in route ? route.method : progress.selectedMethod,
                  'solve',
                )}
              >
                Solve your cube
              </a>
              <a href="#/find-your-route">Find your route</a>
              <SectionMenu
                label="More tools"
                currentHref={location.hash}
                items={[
                  { label: 'CFOP algorithms', href: '#/algorithms' },
                  { label: 'CFOP formula practice', href: '#/practice' },
                  { label: 'Move explorer', href: '#/moves' },
                  { label: 'CMLL library', href: '#/cmll' },
                  { label: 'CMLL practice', href: '#/cmll-practice' },
                  ...('method' in route && route.method === 'roux-beginner'
                    ? [{ label: 'Roux guide', href: '#/guide/roux' }]
                    : []),
                ]}
              />
            </nav>
          )}
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
          ) : route.kind === 'guide' ? (
            <Suspense fallback={<p role="status">Loading the guide…</p>}>
              <GuidePage section={route.section} />
            </Suspense>
          ) : route.kind === 'roux-lab' ? (
            <Suspense fallback={<p role="status">Loading Roux Lab…</p>}>
              <RouxLabWorkspace owner={rouxLabOwner} view={route.view} />
            </Suspense>
          ) : route.kind === 'lab' ? (
            <Suspense fallback={<p role="status">Loading CFOP Lab…</p>}>
              <LabWorkspace
                view={route.view}
                getRepository={labOwner.get}
                trialMemory={labOwner.trial}
              />
            </Suspense>
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
              {route.kind === 'moves' ? (
                <MoveExplorerRoute engine={engine} />
              ) : route.kind === 'timer' ? (
                <Suspense fallback={<p role="status">Loading your practice space…</p>}>
                  <TimerPage engine={engine} repository={timerRepository} />
                </Suspense>
              ) : route.kind === 'cmll-library' ||
                route.kind === 'cmll-case' ||
                route.kind === 'cmll-practice' ||
                ((route.kind === 'solve' || route.kind === 'learn') &&
                  route.method === 'roux-advanced') ? (
                <Suspense fallback={<p role="status">Loading Advanced Roux…</p>}>
                  <AdvancedRouxFeaturePage engine={engine} route={route} />
                </Suspense>
              ) : route.kind === 'learn' && route.method === 'roux-beginner' ? (
                <Suspense fallback={<p role="status">Loading Beginner Roux…</p>}>
                  <RouxFeaturePage engine={engine} route={route} />
                </Suspense>
              ) : route.kind === 'learn' ? (
                <Suspense
                  fallback={
                    <p role="status" className="loading-panel">
                      Loading your lesson…
                    </p>
                  }
                >
                  <ClubLearnPage engine={engine} method={route.method} lessonId={route.lessonId} />
                </Suspense>
              ) : (
                <SharedFeaturePage route={route} engine={engine} />
              )}
            </>
          ) : (
            <p role="status" className="loading-panel">
              Getting your cube ready…
            </p>
          )}
        </TutorialRouteBoundary>
      </main>
      <ClubFooter />
    </>
  );
}
