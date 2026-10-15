import { useCubeEngine } from '../../app/use-cube-engine';
import { useGuidanceTarget } from '../../ui/guidance';
import { LabSessionProvider, useLabSession } from './LabSessionProvider';
import type { LabView } from './session';
import { LabInputPanel } from './LabInputPanel';
import { AnalyzePage } from './AnalyzePage';
import { ComparePage } from './ComparePage';
import { LabPlayer } from './LabPlayer';
import './lab.css';
import { TourEntry } from '../tutorial/TourEntry';
function Workspace() {
  const { state, stop, engine, pinned, prepared, playbackError, registerPlayback } =
      useLabSession(),
    s = state.snapshot;
  const busy = s.phase === 'initializing' || s.phase === 'searching',
    progressTarget = useGuidanceTarget('lab.progress'),
    comparisonTarget = useGuidanceTarget('lab.comparison');
  return (
    <div className="lab-workspace">
      {state.view === 'analyze' && <TourEntry tourId="lab" ready />}
      <header className="lab-intro">
        <div>
          <span className="eyebrow">A LITTLE CURIOSITY. A BETTER NEXT MOVE.</span>
          <h1>Find your flow.</h1>
          <p>Explore Cross + F2L routes. Understand the tradeoffs. Put them to the test.</p>
        </div>
        <span className="lab-badge">CFOP Lab · Experimental</span>
      </header>
      <nav className="lab-tabs" aria-label="Lab workspace">
        {(['analyze', 'compare', 'trials'] as const).map((v, i) => (
          <a
            key={v}
            ref={v === 'compare' ? comparisonTarget : undefined}
            href={v === 'analyze' ? '#/lab' : '#/lab/' + v}
            aria-current={state.view === v ? 'page' : undefined}
          >
            <span>{i + 1}</span>
            {v === 'trials' ? 'Trials & notes' : v === 'analyze' ? 'Analyze' : 'Compare'}
          </a>
        ))}
      </nav>
      {state.invalidated && (
        <p className="notice" role="status">
          Input changed. Previous recommendations, playback and comparisons were cleared. Analyze
          this cube to start again.
        </p>
      )}
      <section className="lab-search-status" ref={progressTarget} aria-label="Search status">
        <div role="status">
          <strong>
            {s.phase === 'initializing'
              ? 'Initializing analysis…'
              : s.phase === 'searching'
                ? 'Searching and verifying routes…'
                : s.phase === 'stopped'
                  ? 'Analysis stopped'
                  : s.phase === 'complete'
                    ? 'Analysis complete'
                    : s.phase === 'error'
                      ? 'Analysis could not continue'
                      : 'Ready to explore'}
          </strong>
          {s.coverage && (
            <span>
              {' '}
              · {Math.round(s.coverage.elapsedMs / 1000)}s · {s.coverage.crossCompletions} cross
              paths · {s.coverage.f2lCompletions} F2L completions
            </span>
          )}
        </div>
        {busy && <button onClick={stop}>Stop analysis</button>}
      </section>
      {s.issue && (
        <p role={s.phase === 'error' ? 'alert' : 'status'} className="notice">
          {s.issue.message}
        </p>
      )}
      {s.coverage && Object.keys(s.coverage.colors).length > 0 && (
        <details className="lab-coverage">
          <summary>Search coverage and exact cross references</summary>
          <ul>
            {Object.entries(s.coverage.colors).map(([color, c]) => (
              <li key={color}>
                {color}: {c.status} · minimum {c.minimum ?? 'not checked'} · {c.holds.length}/4
                holds · lengths {c.lengths.join(', ') || 'none'} · {c.crosses} crosses / {c.f2l} F2L
                completions
              </li>
            ))}
          </ul>
          <p>
            {s.coverage.operations.toLocaleString()} accounted operations ·{' '}
            {s.coverage.rejectedCandidates} rejected candidates. Coverage is not an optimality
            certificate.
          </p>
        </details>
      )}
      <div className={state.view === 'analyze' ? 'lab-grid' : 'lab-grid lab-wide'}>
        <div hidden={state.view !== 'analyze'}>
          <LabInputPanel />
        </div>
        <div className="lab-results">
          <div hidden={state.view !== 'analyze'}>
            <AnalyzePage />
          </div>
          <div hidden={state.view !== 'compare'}>
            <ComparePage />
          </div>
          <div hidden={state.view === 'trials'}>
            {pinned && (
              <section className="lab-card lab-pinned">
                <h2>Pinned route</h2>
                <p>This route stays selected as better recommendations arrive.</p>
                {playbackError ? (
                  <p role="alert">{playbackError}</p>
                ) : prepared ? (
                  <LabPlayer
                    key={pinned.route.id}
                    engine={engine}
                    prepared={prepared}
                    route={pinned}
                    onHandle={registerPlayback}
                  />
                ) : (
                  <p role="status">Preparing verified playback…</p>
                )}
              </section>
            )}
          </div>
          <div hidden={state.view !== 'analyze'}>
            <AnalyzePage part="alternatives" />
          </div>
          {state.view === 'trials' && (
            <section className="lab-card">
              <h2>Trials & notes</h2>
              <p>
                Save an experiment to compare practiced Cross + F2L execution. The notebook is being
                connected in the next implementation task.
              </p>
            </section>
          )}
        </div>
      </div>
      <p className="lab-footnote">
        Right-hand-led two-handed model · lab-execution-v1 · Estimates await club physical
        calibration. Camera movement, initial positioning and last-layer moves are outside the
        objective.
      </p>
    </div>
  );
}
export function LabWorkspace({ view }: { view: LabView }) {
  const { engine, error, retry } = useCubeEngine(true);
  if (error)
    return (
      <section role="alert">
        <p>{error}</p>
        <button onClick={retry}>Retry Lab setup</button>
      </section>
    );
  return engine ? (
    <LabSessionProvider engine={engine} view={view}>
      <Workspace />
    </LabSessionProvider>
  ) : (
    <p role="status">Preparing the Lab workspace…</p>
  );
}
