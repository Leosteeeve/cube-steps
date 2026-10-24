import { useEffect, useReducer, useRef, useState } from 'react';
import type { CubeEngine, SolveInput } from '../../core/types';
import { useCubeEngine } from '../../app/use-cube-engine';
import { prepareRouxInput } from '../../methods/roux-advanced/input';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import type { RouxSearchClient } from '../../roux-lab/client';
import type { RouxLabOwner } from './owner';
import { initialRouxLabSession, reduceRouxLabSession } from './session';
import { createRouxLabPreferences } from './preferences';
import { AnalyzePage } from './AnalyzePage';
import { ResultSummary } from './ResultSummary';
import { ComparePage } from './ComparePage';
import { RouxLabPlayer } from './RouxLabPlayer';
import { RouxNotebookProvider } from './RouxNotebookProvider';
import { ExperimentPanel } from './ExperimentPanel';
import type { RouxExperiment } from '../../roux-lab/experiments/types';
import type { PlaybackHandle } from '../../player/PlaybackView';
import './roux-lab.css';
export type RouxLabView = 'analyze' | 'compare' | 'trials';
function Body({
  engine,
  owner,
  view,
}: {
  engine: CubeEngine;
  owner: RouxLabOwner;
  view: RouxLabView;
}) {
  const [preferences] = useState(createRouxLabPreferences),
    [loaded] = useState(() => preferences.load()),
    [saved, setSaved] = useState(loaded.status === 'ready');
  const [state, dispatch] = useReducer(reduceRouxLabSession, loaded.frames, initialRouxLabSession),
    epoch = useRef(0),
    handle = useRef<ReturnType<RouxSearchClient['start']> | null>(null);
  const playbackHandle = useRef<PlaybackHandle | null>(null);
  const selected = [state.comparison?.A, state.comparison?.B, ...state.routes].find(
    (r) => r?.id === state.selectedId,
  );
  const [basicBusy, setBasicBusy] = useState(false),
    [basicError, setBasicError] = useState('');
  useEffect(
    () => () => {
      epoch.current++;
      handle.current?.stop();
    },
    [],
  );
  function edit(frames?: readonly RouxFrameId[]) {
    setBasicBusy(false);
    setBasicError('');
    epoch.current++;
    handle.current?.stop();
    handle.current = null;
    dispatch({ type: 'reset', frames });
  }
  async function basicLse() {
    if (!selected) return;
    stop();
    const token = ++epoch.current;
    handle.current = null;
    setBasicBusy(true);
    setBasicError('');
    try {
      const [
        { loadRouxLabAssets },
        { withBasicLse },
        { createRouxSearchBudget },
        { validateRouxRoute },
      ] = await Promise.all([
        import('../../roux-lab/browser-assets'),
        import('../../methods/roux-advanced/complete'),
        import('../../methods/roux-advanced/budget'),
        import('../../methods/roux-advanced/validate'),
      ]);
      const assets = await loadRouxLabAssets();
      if (token !== epoch.current) return;
      const route = validateRouxRoute(
        engine,
        withBasicLse(engine, selected, assets, createRouxSearchBudget('normal')),
        assets,
      );
      dispatch({ type: 'adopt', route });
      dispatch({ type: 'stop' });
    } catch (e) {
      if (token === epoch.current)
        setBasicError(e instanceof Error ? e.message : 'Unable to prepare basic LSE.');
    } finally {
      if (token === epoch.current) setBasicBusy(false);
    }
  }
  function stop() {
    if (handle.current) handle.current.stop();
    else epoch.current++;
    dispatch({ type: 'stop' });
  }
  function quiesce() {
    playbackHandle.current?.pause();
    stop();
  }
  async function loadExperiment(raw: RouxExperiment) {
    quiesce();
    const token = ++epoch.current;
    handle.current = null;
    const [{ loadRouxLabAssets }, { verifyRouxExperiment }] = await Promise.all([
      import('../../roux-lab/browser-assets'),
      import('../../roux-lab/experiments/snapshots'),
    ]);
    const experiment = await verifyRouxExperiment(engine, raw, await loadRouxLabAssets());
    if (token === epoch.current) dispatch({ type: 'load', experiment });
  }
  async function start(source: SolveInput) {
    const token = ++epoch.current;
    handle.current?.stop();
    handle.current = null;
    try {
      const input = prepareRouxInput(engine, source),
        settings = state.settings;
      dispatch({ type: 'start', input });
      const client = await owner.getClient(engine);
      if (token !== epoch.current) return;
      const active = client.start(source, settings, (event) => {
        if (token === epoch.current) dispatch(event);
      });
      handle.current = active;
      const result = await active.done;
      if (token !== epoch.current) return;
      handle.current = null;
      if (result.ok) {
        for (const route of result.routes) dispatch({ kind: 'candidate', route });
        dispatch({ type: 'complete', coverage: result.coverage });
      } else {
        dispatch({ kind: 'progress', coverage: result.coverage });
        dispatch({ type: 'failed', error: result.message });
      }
    } catch (e) {
      if (token === epoch.current)
        dispatch({
          type: 'failed',
          error: e instanceof Error ? e.message : 'Unable to analyze this cube.',
        });
    }
  }
  return (
    <section className="roux-lab-workspace">
      <header className="roux-lab-intro">
        <span className="eyebrow">ROUX TEST LAB · EXPERIMENTAL</span>
        <h1>Build less. Connect better.</h1>
        <p>
          Explore the two blocks together. Keep a shortest-left-block reference, then compare the
          handling in your own hands.
        </p>
      </header>
      <nav className="roux-lab-tabs" aria-label="Roux Lab workspace">
        {(['analyze', 'compare', 'trials'] as const).map((v) => (
          <a
            key={v}
            href={v === 'analyze' ? '#/roux-lab' : `#/roux-lab/${v}`}
            aria-current={view === v ? 'page' : undefined}
          >
            {v === 'analyze' ? 'Analyze' : v === 'compare' ? 'Compare' : 'Trials & notes'}
          </a>
        ))}
      </nav>
      {!saved && (
        <p role="status">
          Saved frame preferences could not be read or written. This page still works; change the
          selection to save explicitly.
        </p>
      )}
      <ResultSummary state={state} onStop={stop} />
      <ExperimentPanel
        engine={engine}
        state={state}
        onLoad={loadExperiment}
        onSaved={(experiment) => dispatch({ type: 'saved', experiment })}
        quiesce={quiesce}
      />
      <div hidden={view !== 'analyze'}>
        <AnalyzePage
          engine={engine}
          state={state}
          onEdit={() => edit()}
          onStart={(source) => void start(source)}
          onFrames={(ids) => {
            edit(ids);
            setSaved(preferences.save(ids));
          }}
          onSelect={(id) => dispatch({ type: 'select', id })}
          onCompare={(id) => dispatch({ type: 'compare', id })}
        />
        {state.comparisonA && (
          <p role="status">
            {state.comparison
              ? 'A and B are fixed. Open Compare to review them.'
              : 'Route A is fixed. Choose a different route for B.'}{' '}
            <a href="#/roux-lab/compare">Open comparison</a>
          </p>
        )}
      </div>
      {view === 'compare' && (
        <ComparePage
          comparison={state.comparison}
          selectedId={state.selectedId}
          onSelect={(id) => dispatch({ type: 'select', id })}
          onClear={() => dispatch({ type: 'clear-comparison' })}
        />
      )}
      {view === 'trials' && (
        <section className="roux-lab-card">
          <h2>Trials & notes</h2>
          <p>Choose a fixed A/B comparison before starting physical trials.</p>
          <a href="#/roux-lab/compare">Review your routes</a>
        </section>
      )}
      {selected && view !== 'trials' && (
        <div>
          <p>
            Playing the fixed {selected.frameId.replace('-', ' / ')} route. New results will not
            change this playback.
          </p>
          <button
            disabled={selected.lseMode === 'basic' || basicBusy}
            onClick={() => void basicLse()}
          >
            {basicBusy
              ? 'Checking basic LSE…'
              : selected.lseMode === 'basic'
                ? 'Basic LSE route selected'
                : 'Show basic LSE as a separate route'}
          </button>
          {basicError && <p role="alert">{basicError}</p>}
        </div>
      )}
      <div hidden={view === 'trials'}>
        {selected && (
          <RouxLabPlayer
            engine={engine}
            route={selected}
            onHandle={(h) => {
              playbackHandle.current = h;
            }}
          />
        )}
      </div>
    </section>
  );
}
export function RouxLabWorkspace({ owner, view }: { owner: RouxLabOwner; view: RouxLabView }) {
  const { engine, error, retry } = useCubeEngine(true);
  if (error)
    return (
      <section role="alert">
        <p>{error}</p>
        <button onClick={retry}>Retry loading Roux Lab</button>
      </section>
    );
  return engine ? (
    <RouxNotebookProvider owner={owner}>
      <Body engine={engine} owner={owner} view={view} />
    </RouxNotebookProvider>
  ) : (
    <p role="status">Loading Roux Lab…</p>
  );
}
