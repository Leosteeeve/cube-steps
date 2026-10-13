import { lazy, Suspense, useEffect, useState } from 'react';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { LearnPage } from './LearnPage';
import { SolvePage } from './SolvePage';
import { parseRoute, methodRoute } from './routes';
import { getMethod } from '../methods/registry';
const AlgorithmLibraryPage = lazy(() =>
  import('./algorithms/AlgorithmLibraryPage').then((m) => ({ default: m.AlgorithmLibraryPage })),
);
const AlgorithmDetailPage = lazy(() =>
  import('./algorithms/AlgorithmDetailPage').then((m) => ({ default: m.AlgorithmDetailPage })),
);
const PracticePage = lazy(() =>
  import('./practice/PracticePage').then((m) => ({ default: m.PracticePage })),
);
export function App() {
  const [route, setRoute] = useState(() => parseRoute(location.hash)),
    [engine, setEngine] = useState<CubeEngine | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const change = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', change);
    void createCubeEngine()
      .then(setEngine)
      .catch((e) => setError(String(e)));
    return () => removeEventListener('hashchange', change);
  }, []);
  const methodId = 'method' in route ? route.method : 'lbl',
    method = getMethod(methodId);
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
      <header className="site-header">
        <a className="brand" href="#/learn/notation" aria-label="CubeSteps home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          CubeSteps<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Main navigation">
          <a
            href={methodRoute(methodId, 'learn')}
            className={route.kind === 'learn' ? 'selected' : ''}
          >
            Learn the method
          </a>
          <a
            href={methodRoute(methodId, 'solve')}
            className={route.kind === 'solve' ? 'selected' : ''}
          >
            Solve your cube
          </a>
          <a
            href="#/algorithms"
            className={route.kind === 'algorithms' || route.kind === 'algorithm' ? 'selected' : ''}
          >
            Algorithms
          </a>
          <a href="#/practice" className={route.kind === 'practice' ? 'selected' : ''}>
            Practice
          </a>
        </nav>
        <a
          className="github-link"
          href="https://github.com/Leosteeeve/cube-steps"
          target="_blank"
          rel="noreferrer"
        >
          Open source <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="main" tabIndex={-1}>
        {'method' in route && (
          <div className="course-banner">
            <span className="pill">
              {methodId === 'lbl' ? 'BEGINNER’S METHOD' : 'CROSS · F2L · OLL · PLL'}
            </span>
            <p>Understand the moves. Enjoy the solve.</p>
            <span className="preview-label" data-preview={method.teachingStatus === 'preview'}>
              {method.label}
              {method.teachingStatus === 'preview' ? ' · Preview' : ''}
            </span>
          </div>
        )}
        {route.kind === 'not-found' ? (
          <section className="loading-panel">
            <h1>Page not found.</h1>
            <p>This route does not match an available course or method.</p>
            <p>
              <a href="#/learn/notation">Learn LBL</a> ·{' '}
              <a href="#/learn/cfop/intro">Learn Beginner CFOP</a> ·{' '}
              <a href="#/learn/advanced-cfop/intro">Learn Advanced CFOP</a>
            </p>
          </section>
        ) : error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : engine ? (
          route.kind === 'practice' ? (
            <Suspense
              fallback={
                <p className="loading-panel" role="status">
                  Loading practice…
                </p>
              }
            >
              <PracticePage engine={engine} />
            </Suspense>
          ) : route.kind === 'algorithms' || route.kind === 'algorithm' ? (
            <Suspense
              fallback={
                <p className="loading-panel" role="status">
                  Loading the algorithm library…
                </p>
              }
            >
              {route.kind === 'algorithms' ? (
                <AlgorithmLibraryPage engine={engine} />
              ) : (
                <AlgorithmDetailPage engine={engine} caseId={route.caseId} />
              )}
            </Suspense>
          ) : route.kind === 'solve' ? (
            <SolvePage engine={engine} method={route.method} />
          ) : (
            <LearnPage
              key={route.method + '/' + route.lessonId}
              engine={engine}
              method={route.method}
              lessonId={route.lessonId}
            />
          )
        ) : (
          <p className="loading-panel" role="status">
            Getting your cube ready…
          </p>
        )}
      </main>
      <footer className="site-footer">
        <p>Small steps. A whole new way to see the cube.</p>
        <span>
          CubeSteps · MIT ·{' '}
          <a href={import.meta.env.BASE_URL + 'THIRD_PARTY_NOTICES.md'}>Third-party notices</a>
        </span>
      </footer>
    </>
  );
}
