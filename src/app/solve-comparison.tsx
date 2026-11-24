import { useLayoutEffect, useRef, useState } from 'react';
import type { SolveSession, StageId } from '../core/types';
import { getMethodInfo } from '../methods/info';
import type { RouxFrameId } from '../methods/roux-advanced/types';
import { createSolveClient, type SessionResult } from './solve-client';
import { summarizeTraceMoves } from './solve-comparison-metrics';
import './solve-comparison.css';

const methods = ['cfop-advanced', 'roux-advanced'] as const;
type ComparisonMethod = (typeof methods)[number];
type Outcome =
  | { status: 'pending' | 'cancelled' }
  | { status: 'failed'; reason: string }
  | { status: 'ready'; session: SolveSession; metrics: ReturnType<typeof summarizeTraceMoves> };
type Outcomes = Record<ComparisonMethod, Outcome>;
type Client = ReturnType<typeof createSolveClient>;
const defaultFrames: readonly RouxFrameId[] = ['white-blue'];

function compareTurns(results: Outcomes): string {
  const cfop = results['cfop-advanced'],
    roux = results['roux-advanced'];
  if (cfop.status !== 'ready' || roux.status !== 'ready') {
    return 'Both searches use the same starting cube.';
  }
  const difference = cfop.metrics.turns - roux.metrics.turns;
  if (!difference) return 'Both routes use the same number of turns.';
  const shorter = getMethodInfo(difference > 0 ? 'roux-advanced' : 'cfop-advanced').label;
  const count = Math.abs(difference);
  return `${shorter} uses ${count} fewer ${count === 1 ? 'turn' : 'turns'} on this cube.`;
}

function outcome(result: SessionResult, method: ComparisonMethod): Outcome {
  if (result.ok)
    return {
      status: 'ready',
      session: result.session,
      metrics: summarizeTraceMoves(result.session.trace),
    };
  if (result.error.kind === 'cancelled') return { status: 'cancelled' };
  const stage = getMethodInfo(method).stages.find((stage) => stage.id === result.error.stageId);
  return {
    status: 'failed',
    reason: stage ? `${stage.label}: ${result.error.message}` : result.error.message,
  };
}

export function useSolveComparison(source: SolveSession | null, frames = defaultFrames) {
  const jobs = useRef(new Map<ComparisonMethod, Client>());
  const [results, setResults] = useState<Outcomes | null>(null);
  const [preview, setPreview] = useState<{
    session: SolveSession;
    stage: StageId;
    active: StageId;
    requestId: number;
  } | null>(null);
  const framesKey = frames.join(',');

  function stopJobs() {
    const pending = [...jobs.current.values()];
    jobs.current.clear();
    for (const client of pending) client.cancel();
  }
  function clear() {
    stopJobs();
    setResults(null);
    setPreview(null);
  }
  useLayoutEffect(() => {
    setResults(null);
    setPreview(null);
    return stopJobs;
  }, [source, framesKey]);

  function update(method: ComparisonMethod, result: Outcome) {
    setResults((old) => old && { ...old, [method]: result });
  }
  function cancel(method: ComparisonMethod) {
    const client = jobs.current.get(method);
    if (!client) return;
    jobs.current.delete(method);
    client.cancel();
    update(method, { status: 'cancelled' });
  }
  async function solveCandidate(source: SolveSession, method: ComparisonMethod) {
    const client = createSolveClient(undefined, 'club');
    jobs.current.set(method, client);
    const options = method === 'roux-advanced' ? { allowedFrames: [...frames] } : undefined;
    try {
      const { input } = source;
      const result =
        input.kind === 'scramble'
          ? await client.solveScramble(input.moves.join(' '), method, options)
          : await client.solveFacelets(input.facelets, method, options);
      if (jobs.current.get(method) === client) update(method, outcome(result, method));
    } catch (error) {
      if (jobs.current.get(method) === client)
        update(method, {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'The search could not finish.',
        });
    } finally {
      if (jobs.current.get(method) === client) jobs.current.delete(method);
    }
  }
  function start() {
    if (!source) return;
    stopJobs();
    setPreview(null);
    setResults({ 'cfop-advanced': { status: 'pending' }, 'roux-advanced': { status: 'pending' } });
    for (const method of methods) void solveCandidate(source, method);
  }
  function show(session: SolveSession) {
    const stage = getMethodInfo(session.trace.method).stages[0].id;
    setPreview({ session, stage, active: stage, requestId: 0 });
  }
  return {
    results,
    preview,
    start,
    cancel,
    clear,
    show,
    retry: (method: ComparisonMethod) => {
      if (!source || jobs.current.has(method)) return;
      update(method, { status: 'pending' });
      void solveCandidate(source, method);
    },
    back: () => setPreview(null),
    seek: (stage: StageId) =>
      setPreview((old) => old && { ...old, stage, active: stage, requestId: old.requestId + 1 }),
    setActive: (active: StageId) =>
      setPreview((old) => (old && old.active !== active ? { ...old, active } : old)),
  };
}

export function SolveComparison({
  comparison,
  playerId,
}: {
  comparison: ReturnType<typeof useSolveComparison>;
  playerId: string;
}) {
  const { results, preview, start, cancel, clear, show, back, retry } = comparison;
  const pending = results && methods.some((method) => results[method].status === 'pending');
  const activator = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lastRouteButton = useRef<HTMLButtonElement>(null);
  const selectedSession = preview?.session;
  useLayoutEffect(() => {
    if (selectedSession) document.getElementById(playerId)?.focus();
  }, [playerId, selectedSession]);
  const restoreFocus = useRef(false);
  useLayoutEffect(() => {
    if (restoreFocus.current) {
      (results ? heading.current : activator.current)?.focus();
      restoreFocus.current = false;
    }
  }, [!!results]);
  if (!results)
    return (
      <button
        className="compare-launch"
        type="button"
        ref={activator}
        onClick={() => {
          restoreFocus.current = true;
          start();
        }}
      >
        Compare CFOP and Roux <span aria-hidden="true">→</span>
      </button>
    );
  return (
    <section className="solve-comparison" aria-label="Method comparison">
      <div className="compare-heading">
        <h2 ref={heading} tabIndex={-1}>
          Compare methods
        </h2>
        <button
          type="button"
          onClick={() => {
            restoreFocus.current = true;
            clear();
          }}
        >
          {pending ? 'Cancel comparison' : 'Close comparison'}
        </button>
      </div>
      <p aria-live="polite">
        <strong>{compareTurns(results)}</strong> Try each route with your cube to compare your time.
      </p>
      <div className="compare-routes">
        {methods.map((method) => {
          const result = results[method],
            info = getMethodInfo(method);
          const frame =
            result.status === 'ready'
              ? result.session.trace.rouxAdvanced?.frameId.split('-')
              : undefined;
          return (
            <article className="compare-route" aria-label={info.label} key={method}>
              <header>
                <h3>{info.label}</h3>
                {info.teachingStatus === 'preview' && <span>Preview</span>}
              </header>
              {result.status === 'pending' && <p role="status">Finding a verified route…</p>}
              {result.status === 'cancelled' && <p role="status">Search cancelled.</p>}
              {result.status === 'failed' && <p role="status">{result.reason}</p>}
              {result.status === 'ready' && (
                <>
                  <dl className="compare-metrics" aria-label={info.label + ' move counts'}>
                    <div>
                      <dt>Turns</dt>
                      <dd>{result.metrics.turns}</dd>
                    </div>
                    <div>
                      <dt>Slice turns</dt>
                      <dd>{result.metrics.slices}</dd>
                    </div>
                    <div>
                      <dt>Rotations</dt>
                      <dd>{result.metrics.rotations}</dd>
                    </div>
                  </dl>
                  {frame && (
                    <p className="compare-hold">
                      Hold {frame[0]} bottom · {frame[1]} left
                    </p>
                  )}
                </>
              )}
              <button
                type="button"
                aria-pressed={
                  result.status === 'ready' ? preview?.session === result.session : undefined
                }
                aria-controls={result.status === 'ready' ? playerId : undefined}
                onClick={(event) => {
                  if (result.status === 'pending') return cancel(method);
                  if (result.status !== 'ready') return retry(method);
                  lastRouteButton.current = event.currentTarget;
                  if (selectedSession === result.session)
                    document.getElementById(playerId)?.focus();
                  else show(result.session);
                }}
              >
                {result.status === 'ready' ? (
                  <>
                    View {info.label} steps <span aria-hidden="true">↓</span>
                  </>
                ) : (
                  <>
                    {result.status === 'pending' ? 'Cancel' : 'Retry'} {info.label}
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
      <p className="compare-note">
        Half turns count once. Turns include slice turns. Whole-cube rotations are counted
        separately.
      </p>
      <div className="compare-actions">
        {preview && (
          <button
            type="button"
            onClick={() => {
              back();
              lastRouteButton.current?.focus();
            }}
          >
            Back to my solution
          </button>
        )}
        {!pending && (
          <button
            type="button"
            onClick={() => {
              start();
              heading.current?.focus();
            }}
          >
            Compare again
          </button>
        )}
      </div>
    </section>
  );
}
