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
  useEffect(
    () => () => {
      epoch.current++;
      handle.current?.stop();
    },
    [],
  );
  function edit(frames?: readonly RouxFrameId[]) {
    epoch.current++;
    handle.current?.stop();
    handle.current = null;
    dispatch({ type: 'reset', frames });
  }
  function stop() {
    if (handle.current) handle.current.stop();
    else epoch.current++;
    dispatch({ type: 'stop' });
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
      />
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
    <Body engine={engine} owner={owner} view={view} />
  ) : (
    <p role="status">Loading Roux Lab…</p>
  );
}
