import { useEffect, useRef, useState } from 'react';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import { LBL_ALGORITHMS, type AlgorithmId } from '../methods/lbl/catalog';
import {
  createPlaybackController,
  type PlaybackController,
  type PlaybackSnapshot,
} from './controller';
import { createCubingAdapter } from './cubing-adapter';
const stageTitle = (id: string) =>
  id
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
interface Props {
  engine: CubeEngine;
  session: SolveSession;
  stage?: StageId;
  stageRequestId?: number;
  onStageChange?: (id: StageId) => void;
}
export function CubePlayer({ engine, session, stage, stageRequestId, onStageChange }: Props) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<PlaybackController | null>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(null),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [focused, setFocused] = useState(true);
  const focusRef = useRef(true),
    stageCallback = useRef(onStageChange);
  stageCallback.current = onStageChange;
  focusRef.current = focused;
  useEffect(() => {
    const player = createPlaybackController(engine, session);
    controller.current = player;
    let cancelled = false,
      adapter: Awaited<ReturnType<typeof createCubingAdapter>> | undefined;
    setReady(false);
    setError('');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const unsubscribe = player.subscribe((s) => {
      setSnapshot(s);
      if (adapter) {
        adapter.setTimestamp(reduced.matches ? adapter.boundaries[s.moveIndex] : s.timestamp);
        adapter.highlight(
          focusRef.current ? (player.timeline.actions[s.actionIndex]?.action.targets ?? []) : [],
        );
      }
      stageCallback.current?.(s.stageId);
    });
    createCubingAdapter(host.current!, session)
      .then((result) => {
        if (cancelled) {
          result.dispose();
          return;
        }
        adapter = result;
        player.setBoundaries(result.boundaries);
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to display the cube.');
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
      unsubscribe();
      player.dispose();
      adapter?.dispose();
      controller.current = null;
    };
  }, [engine, session]);
  useEffect(() => {
    if (stage) controller.current?.seekStage(stage);
  }, [stage, stageRequestId, ready]);
  useEffect(() => {
    const p = controller.current;
    if (p) p.setSpeed(p.snapshot().speed);
  }, [focused]);
  const player = controller.current,
    s = snapshot;
  const currentStage = session.trace.stages.find((item) => item.id === s?.stageId);
  const range = player?.timeline.actions[s?.actionIndex ?? -1],
    action = currentStage?.status === 'skipped' ? undefined : range?.action;
  const alg = action?.algorithmId ? LBL_ALGORITHMS[action.algorithmId as AlgorithmId] : undefined;
  const repetitions = action?.repetition
    ? player?.timeline.actions.filter(
        (a) => a.action.repetition?.group === action.repetition?.group,
      ).length
    : undefined;
  const targets = s ? engine.observe(s.boundaryState) : null;
  return (
    <div className="player-area">
      <section
        className="cube-panel"
        aria-label="Cube player"
        data-boundary-state={s ? JSON.stringify(s.boundaryState.data) : undefined}
      >
        <div className="cube-meta">
          <span className="pill">3 × 3 · LBL</span>
          <span className="muted" data-testid="move-position">
            Move {s?.moveIndex ?? 0} of {s?.total ?? 0}
          </span>
        </div>
        <div className="cube-canvas" ref={host} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!ready && <p role="status">Preparing the cube…</p>}
        <p className="orbit-note">Drag to look around · View changes do not turn the cube</p>
        <div className="playback-controls">
          <button
            className="icon-button"
            aria-label="Previous move"
            disabled={!ready || !s || (s.moveIndex === 0 && s.progress === 0)}
            onClick={() => player?.step(-1)}
          >
            ←
          </button>
          <button
            className="play-button"
            disabled={!ready || !s?.total}
            onClick={() => (s?.playing ? player?.pause() : player?.play())}
          >
            {s?.playing ? 'Pause' : 'Play'} <span aria-hidden="true">{s?.playing ? 'Ⅱ' : '▶'}</span>
          </button>
          <button
            className="icon-button"
            aria-label="Next move"
            disabled={!ready || !s || s.moveIndex >= s.total}
            onClick={() => player?.step(1)}
          >
            →
          </button>
          <label className="speed">
            Speed
            <select
              aria-label="Playback speed"
              value={s?.speed ?? 1}
              onChange={(e) => player?.setSpeed(Number(e.target.value))}
            >
              {[0.25, 0.5, 1, 2].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          className="move-range"
          type="range"
          aria-label="Move position"
          min="0"
          max={s?.total ?? 0}
          value={s?.moveIndex ?? 0}
          disabled={!ready || !s?.total}
          onChange={(e) => player?.seekMove(Number(e.target.value))}
        />
        <div className="player-options">
          <label>
            <input
              type="checkbox"
              checked={focused}
              onChange={(e) => setFocused(e.target.checked)}
            />{' '}
            Highlight target pieces
          </label>
          <button
            className="text-button"
            disabled={!ready || !action}
            onClick={() => player?.replayAction(s!.actionIndex)}
          >
            Replay {alg ? 'formula' : 'action'} ↺
          </button>
        </div>
      </section>
      <aside className="explanation" aria-label="Step explanation">
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h2>{currentStage ? stageTitle(currentStage.id) : 'Preparing your solve'}</h2>
        {currentStage?.status === 'skipped' ? (
          <div className="notice">
            <h3>Already complete</h3>
            <p>{currentStage.skipReason}</p>
            <p>No turns are needed for this stage.</p>
          </div>
        ) : action ? (
          <>
            <div className="step-section">
              <span className="step-number">01</span>
              <div>
                <h3>Observe</h3>
                <p>{action.recognition}</p>
              </div>
            </div>
            <div className="step-section">
              <span className="step-number">02</span>
              <div>
                <h3>
                  {action.kind === 'regrip'
                    ? 'Regrip the whole cube'
                    : action.kind === 'setup'
                      ? 'Prepare'
                      : 'Apply the formula'}
                </h3>
                <p>{action.explanation}</p>
              </div>
            </div>
            <div className="algorithm-card">
              <span>
                {alg?.name ?? (action.kind === 'regrip' ? 'Whole-cube rotation' : 'Setup moves')}
                {repetitions ? ` · ${action.repetition!.index} of ${repetitions}` : ''}
              </span>
              <div className="algorithm-moves">
                {action.moves.map((move, i) => (
                  <b key={i} aria-current={s?.moveIndex === range!.start + i ? 'step' : undefined}>
                    {move}
                  </b>
                ))}
              </div>
              <small>
                Current move: <strong>{s?.currentMove ?? 'Complete'}</strong>
              </small>
            </div>
            <div className="step-section">
              <span className="step-number">03</span>
              <div>
                <h3>Check the result</h3>
                <p>{action.checkpoint.description}</p>
                {action.targets.map((id) => {
                  const after = engine.observe(action.after);
                  const p = [...after.edges, ...after.corners].find((p) => p.id === id);
                  return p ? (
                    <p className="piece-label" key={id}>
                      {Object.values(p.stickers).join(' / ')} → {p.slot}
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          </>
        ) : s?.currentMove === null ? (
          <div className="notice">
            <h3>Cube solved.</h3>
            <p>
              All six faces match their centers. Replay a stage whenever you want to see why it
              works.
            </p>
          </div>
        ) : (
          <p>Choose a stage or press Play.</p>
        )}
        {targets && (
          <p className="holding-note">
            Holding now: {targets.centers.U} up · {targets.centers.F} front
          </p>
        )}
      </aside>
    </div>
  );
}
