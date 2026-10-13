import { useEffect, useState } from 'react';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { LearnPage } from './LearnPage';
import { SolvePage } from './SolvePage';
import { parseRoute, methodRoute } from './routes';
import { getMethod } from '../methods/registry';
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
  const free = route.kind === 'solve',
    method = getMethod(route.method);
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
          <a href={methodRoute(route.method, 'learn')} className={!free ? 'selected' : ''}>
            Learn the method
          </a>
          <a href={methodRoute(route.method, 'solve')} className={free ? 'selected' : ''}>
            Solve your cube
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
        <div className="course-banner">
          <span className="pill">
            {route.method === 'lbl' ? 'BEGINNER’S METHOD' : 'CROSS · F2L · OLL · PLL'}
          </span>
          <p>Understand the moves. Enjoy the solve.</p>
          <span className="preview-label">{method.label}</span>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : engine ? (
          free ? (
            <SolvePage engine={engine} method={route.method} />
          ) : (
            route.kind === 'learn' && (
              <LearnPage
                key={`${route.method}/${route.lessonId}`}
                engine={engine}
                method={route.method}
                lessonId={route.lessonId}
              />
            )
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
          <a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.md`}>Third-party notices</a>
        </span>
      </footer>
    </>
  );
}
