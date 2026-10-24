import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGuidanceAction, useGuidanceScope, useGuidanceTarget } from '../ui/guidance';
import type { CubeEngine } from '../core/types';
import type { PlaybackSource, PlaybackSectionId } from './playback-source';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { loadAdvancedAssets, type AdvancedAssets } from '../methods/advanced/assets';
import { getMethod } from '../methods/registry';
import {
  createSourcePlaybackController,
  type SourcePlaybackController,
  type SourcePlaybackSnapshot,
} from './controller';
import { createCubingAdapter } from './cubing-adapter';
import { RegripGuide } from './RegripGuide';
import { CubeStage } from './CubeStage';
import { createCubeViewStore, type CubeViewPreferences } from './view-preferences';
import { CubeNet } from './CubeNet';
import { targetFacelets } from './target-view';
import { stateToFacelets } from '../core/facelets';
const RouxPlaybackGuide = lazy(() =>
  import('./RouxHoldingGuide').then((m) => ({ default: m.RouxPlaybackGuide })),
);
const stageTitle = (id: string) =>
  id
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
export interface PlaybackHandle {
  pause(): void;
}
interface Props {
  engine: CubeEngine;
  source: PlaybackSource;
  section?: PlaybackSectionId;
  sectionRequestId?: number;
  onSectionChange?: (id: PlaybackSectionId) => void;
  caseId?: string;
  onHandle?: (handle: PlaybackHandle | null) => void;
  onPosition?: (position: SourcePlaybackSnapshot) => void;
}
export function PlaybackView({
  engine,
  source,
  section,
  sectionRequestId,
  onSectionChange,
  caseId,
  onHandle,
  onPosition,
}: Props) {
  const viewStore = useMemo(() => createCubeViewStore(() => localStorage), []);
  const [view, setView] = useState(() => viewStore.load());
  const viewRef = useRef(view);
  viewRef.current = view;
  const adapterRef = useRef<Awaited<ReturnType<typeof createCubingAdapter>> | null>(null);
  function changeView(value: CubeViewPreferences) {
    setView(value);
    viewStore.save(value);
  }
  useEffect(() => {
    adapterRef.current?.setViewOptions(view);
  }, [view]);
  const needsAdvanced = source.kind === 'solve' && source.session.trace.method === 'cfop-advanced';
  const [assets, setAssets] = useState<AdvancedAssets>(),
    [assetError, setAssetError] = useState('');
  const method =
    source.kind === 'solve'
      ? getMethod(source.session.trace.method)
      : source.kind === 'lab'
        ? { label: source.prepared.label, algorithms: source.prepared.algorithms }
        : {
            label: ALGORITHM_REGISTRY.cases[source.demonstration.caseId]?.label ?? 'Algorithm',
            algorithms: ALGORITHM_REGISTRY.variants,
          };
  useEffect(() => {
    if (!needsAdvanced || assets) return;
    const abort = new AbortController();
    setAssetError('');
    void loadAdvancedAssets(fetch, abort.signal)
      .then(setAssets)
      .catch((e) => {
        if (!abort.signal.aborted)
          setAssetError(
            e instanceof Error ? e.message : 'Unable to load verified playback assets.',
          );
      });
    return () => abort.abort();
  }, [needsAdvanced, assets, source]);
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<SourcePlaybackController | null>(null);
  const [snapshot, setSnapshot] = useState<SourcePlaybackSnapshot | null>(null),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [focused, setFocused] = useState(true);
  const focusRef = useRef(true),
    sectionCallback = useRef(onSectionChange);
  const restoredSection = useRef<{
    source: PlaybackSource;
    sectionId: PlaybackSectionId;
    requestId?: number;
  } | null>(null);
  sectionCallback.current = onSectionChange;
  focusRef.current = focused;
  const handleCallback = useRef(onHandle),
    positionCallback = useRef(onPosition);
  handleCallback.current = onHandle;
  positionCallback.current = onPosition;
  // Install each replacement controller before the positioning effect below.
  useLayoutEffect(() => {
    if (needsAdvanced && !assets) {
      controller.current = null;
      setSnapshot(null);
      setReady(false);
      setError(assetError);
      return;
    }
    let player: SourcePlaybackController;
    try {
      player = createSourcePlaybackController(engine, source, assets);
    } catch (e) {
      controller.current = null;
      setSnapshot(null);
      setReady(false);
      setError(e instanceof Error ? e.message : 'Unable to initialize this solution.');
      return;
    }
    controller.current = player;
    handleCallback.current?.({ pause: () => player.pause() });
    let cancelled = false,
      expired = false,
      adapter: Awaited<ReturnType<typeof createCubingAdapter>> | undefined;
    setReady(false);
    setError('');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const unsubscribe = player.subscribe((s) => {
      setSnapshot(s);
      positionCallback.current?.(s);
      if (adapter) {
        adapter.setTimestamp(reduced.matches ? adapter.boundaries[s.moveIndex] : s.timestamp);
        adapter.setTargets(
          focusRef.current ? (player.timeline.actions[s.actionIndex]?.action.targets ?? []) : [],
          s.boundaryState,
        );
      }
      sectionCallback.current?.(s.sectionId);
    });
    const renderFailure = (e: Error) => {
      if (!cancelled) {
        setError(e.message);
        setReady(true);
      }
    };
    const initializationTimer = setTimeout(() => {
      expired = true;
      renderFailure(
        new Error(
          '3D initialization timed out. Continue with the synchronized six-face view below.',
        ),
      );
    }, 8000);
    createCubingAdapter(host.current!, engine, source, renderFailure)
      .then((result) => {
        if (cancelled || expired) {
          result.dispose();
          return;
        }
        adapter = result;
        adapterRef.current = result;
        result.setViewOptions(viewRef.current);
        player.setBoundaries(result.boundaries);
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to display the cube.');
          setReady(true);
        }
      })
      .finally(() => clearTimeout(initializationTimer));
    return () => {
      cancelled = true;
      clearTimeout(initializationTimer);
      unsubscribe();
      player.dispose();
      adapter?.dispose();
      if (adapterRef.current === adapter) adapterRef.current = null;
      controller.current = null;
      handleCallback.current?.(null);
    };
  }, [engine, source, assets, needsAdvanced, assetError]);
  // Position the lesson before enabled controls can accept the first user input.
  useLayoutEffect(() => {
    const restored = restoredSection.current;
    if (restored) {
      restoredSection.current = null;
      if (
        restored.source === source &&
        restored.sectionId === section &&
        restored.requestId === sectionRequestId
      )
        return;
    }
    if (section) controller.current?.seekSection(section);
    if (caseId) {
      const action = controller.current?.timeline.actions.find(
        (item) => item.sectionId === section && item.action.caseId === caseId,
      );
      if (action) controller.current?.seekMove(action.start);
    }
  }, [engine, source, section, sectionRequestId, ready, caseId, assets]);
  const requestRef = useRef(sectionRequestId);
  requestRef.current = sectionRequestId;
  useGuidanceScope(
    'shared-playback',
    useCallback(() => {
      const p = controller.current;
      p?.pause();
      const saved = p?.snapshot();
      let live = true;
      return {
        restore() {
          if (!live || !p || controller.current !== p || !saved) return;
          restoredSection.current = {
            source,
            sectionId: saved.sectionId,
            requestId: requestRef.current,
          };
          p.restorePaused(saved);
        },
        dispose() {
          live = false;
        },
      };
    }, [engine, source, assets, needsAdvanced, assetError]),
  );
  useEffect(() => {
    const p = controller.current;
    if (p) p.setSpeed(p.snapshot().speed);
  }, [focused]);
  const player = controller.current,
    s = snapshot;
  const emit = useGuidanceAction(),
    controlsTarget = useGuidanceTarget('player.controls', ready),
    nextTarget = useGuidanceTarget('player.next', ready && !!s && s.moveIndex < s.total),
    turnTarget = useGuidanceTarget('player.turn', ready);
  const currentStage = player?.timeline.sections.find((item) => item.id === s?.sectionId);
  const range = player?.timeline.actions[s?.actionIndex ?? -1],
    action = Boolean(currentStage?.skipReason) ? undefined : range?.action;
  const alg = action?.algorithmId ? method.algorithms[action.algorithmId] : undefined;
  const connectedPairs =
    action?.joined?.sources.flatMap((source) => (source.pair ? [source.pair] : [])) ?? [];
  const replayIndex = action
    ? s!.actionIndex
    : source.kind === 'algorithm' && s?.currentMove === null && player
      ? player.timeline.actions.length - 1
      : -1;
  const replayAction = player?.timeline.actions[replayIndex]?.action;
  const replayAlgorithm = replayAction?.algorithmId;
  const segment = alg?.segments?.find(
    (part) =>
      s && range && s.moveIndex - range.start >= part.start && s.moveIndex - range.start < part.end,
  );
  const repetitions = action?.repetition
    ? player?.timeline.actions.filter(
        (a) => a.action.repetition?.group === action.repetition?.group,
      ).length
    : undefined;
  const nearbyStart = s ? Math.max(0, Math.min(s.moveIndex - 2, s.total - 5)) : 0;
  const netFacelets = useMemo(
    () => (s ? stateToFacelets(s.boundaryState) : null),
    [s?.boundaryState],
  );
  const netTargets = useMemo(
    () => (s && focused ? targetFacelets(engine, s.boundaryState, action?.targets ?? []) : []),
    [engine, s?.boundaryState, action, focused],
  );
  const centers = s ? engine.observe(s.boundaryState).centers : null;
  return (
    <div className="player-area">
      <section
        className="cube-panel"
        aria-label="Cube player"
        data-background={view.background}
        data-boundary-state={s ? JSON.stringify(s.boundaryState.data) : undefined}
      >
        <div className="cube-meta">
          <span className="pill">3 × 3 · {method.label}</span>
          <span className="muted" data-testid="move-position">
            Move {s?.moveIndex ?? 0} of {s?.total ?? 0}
          </span>
        </div>
        <CubeStage
          hostRef={host}
          preferences={view}
          onPreferencesChange={changeView}
          onResetView={() => adapterRef.current?.resetView()}
          renderUnavailable={!!error}
          holding={
            s && (
              <RegripGuide
                engine={engine}
                boundaryState={s.boundaryState}
                action={action}
                moving={s.progress > 0}
              />
            )
          }
        >
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!ready && !error && <p role="status">Preparing the cube…</p>}
          {netFacelets && centers && (view.showNet || !!error) && (
            <CubeNet
              facelets={netFacelets}
              targets={netTargets}
              holdingLabel={`${s?.progress ? 'Last completed move · ' : ''}${centers.U} up · ${centers.F} front`}
            />
          )}
          <div ref={controlsTarget} className="playback-toolbar">
            {s && player && s.total > 0 && (
              <ol className="nearby-moves" aria-label="Nearby moves">
                {player.timeline.moves.slice(nearbyStart, nearbyStart + 5).map((move, offset) => {
                  const index = nearbyStart + offset;
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        aria-label={`Go to move ${index + 1}: ${move.replaceAll("'", '′')}`}
                        aria-current={index === s.moveIndex ? 'step' : undefined}
                        disabled={!ready}
                        onClick={() => player.seekMove(index)}
                      >
                        {move.replaceAll("'", '′')}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
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
                {s?.playing ? 'Pause' : 'Play'}{' '}
                <span aria-hidden="true">{s?.playing ? 'Ⅱ' : '▶'}</span>
              </button>
              <button
                className="icon-button"
                aria-label="Next move"
                ref={nextTarget}
                disabled={!ready || !s || s.moveIndex >= s.total}
                onClick={() => {
                  if (!player) return;
                  const before = player.snapshot().moveIndex;
                  player.step(1);
                  if (player.snapshot().moveIndex > before) emit({ name: 'player-next' });
                }}
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
                disabled={!ready || replayIndex < 0}
                onClick={() => player?.replayAction(replayIndex)}
              >
                Replay{' '}
                {replayAction?.joined ? 'connected moves' : replayAlgorithm ? 'formula' : 'action'}{' '}
                ↺
              </button>
            </div>
          </div>
        </CubeStage>
      </section>
      <aside className="explanation" aria-label="Step explanation">
        {s && source.kind === 'solve' && source.session.trace.method === 'roux-beginner' && (
          <Suspense fallback={null}>
            <RouxPlaybackGuide
              engine={engine}
              boundaryState={s.boundaryState}
              action={action}
              completedMoves={
                range
                  ? Math.max(0, Math.min(action?.moves.length ?? 0, s.moveIndex - range.start))
                  : 0
              }
              moving={s.progress > 0}
            />
          </Suspense>
        )}
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h2>{currentStage ? currentStage.label : 'Preparing your solve'}</h2>
        {currentStage?.skipReason ? (
          <div className="notice">
            <h3>Already complete</h3>
            <p>{currentStage.skipReason}</p>
            <p>No turns are needed for this stage.</p>
            {s?.currentMove === null && (
              <>
                <h3>{player?.timeline.completion.title}</h3>
                <p>{player?.timeline.completion.description}</p>
              </>
            )}
          </div>
        ) : action ? (
          <>
            {action.cross && (
              <p className="notice">
                Shortest cross: {action.cross.distanceBefore} → {action.cross.distanceAfter} face
                turns remaining.
              </p>
            )}
            {action.pair && (
              <div className="notice">
                <h3>
                  Pair {action.pair.ordinal} of 4 · {stageTitle(action.pair.phase)}
                </h3>
                <p>
                  Target slot: {action.pair.slot} · {action.pair.solvedBefore} complete before this
                  action; {action.pair.solvedAfter} after.
                </p>
              </div>
            )}
            {!action.pair && connectedPairs.length > 0 && (
              <div className="notice">
                <h3>
                  Pair {connectedPairs[0].ordinal} of 4 → Pair {connectedPairs.at(-1)!.ordinal} of 4
                  · Connected sequence
                </h3>
                <p>
                  {connectedPairs[0].solvedBefore} complete before this sequence;{' '}
                  {connectedPairs.at(-1)!.solvedAfter} after. Follow all highlighted targets and
                  check them at the end.
                </p>
              </div>
            )}
            {currentStage?.id === 'white-cross' && (
              <h3 className="notice">
                {action.ruleId.startsWith('cross-')
                  ? '2 · Match and lower each petal'
                  : '1 · Build the daisy'}
              </h3>
            )}
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
                    : action.kind === 'joined'
                      ? 'Connect the moves'
                      : action.kind === 'setup'
                        ? 'Prepare'
                        : 'Apply the formula'}
                </h3>
                <p>{action.explanation}</p>
              </div>
            </div>
            <div
              className="algorithm-card"
              data-case-id={action.caseId}
              data-algorithm-id={action.algorithmId}
              data-action-start={range?.start}
              data-action-end={range?.end}
            >
              <span>
                {alg?.name ??
                  (action.kind === 'joined'
                    ? 'Connected moves'
                    : action.kind === 'regrip'
                      ? 'Whole-cube rotation'
                      : 'Setup moves')}
                {repetitions ? ` · ${action.repetition!.index} of ${repetitions}` : ''}
              </span>
              <div className="algorithm-moves">
                {action.moves.map((move, i) => (
                  <b key={i} aria-current={s?.moveIndex === range!.start + i ? 'step' : undefined}>
                    {move}
                  </b>
                ))}
              </div>
              <small ref={turnTarget} className="current-turn">
                Current move:{' '}
                <strong aria-label={s?.currentMove ? 'Current turn' : undefined}>
                  {s?.currentMove ?? 'Complete'}
                </strong>
              </small>
              {segment && <p>Segment: {segment.label}</p>}
              {action.joined && (
                <details className="connected-reference">
                  <summary>Why these steps are connected</summary>
                  <p>
                    Reference only — do not perform these again. The original steps below explain
                    the route; the connected moves above replace them and save{' '}
                    {action.joined.savedMoves} moves.
                  </p>
                  <ol>
                    {action.joined.sources.map((source, i) => (
                      <li key={i}>
                        <strong>
                          {source.algorithmId
                            ? method.algorithms[source.algorithmId]?.name
                            : source.kind === 'regrip'
                              ? 'Whole-cube rotation'
                              : 'Setup'}
                        </strong>
                        <p>
                          <code>{source.moves.join(' ').replaceAll("'", '′')}</code>
                        </p>
                        <p>{source.explanation}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {source.kind !== 'lab' &&
                action.algorithmId &&
                ALGORITHM_REGISTRY.variants[action.algorithmId] && (
                  <p>
                    <a href={'#/algorithms/' + action.caseId}>Explore this case →</a>
                  </p>
                )}
              {action.moves.some((move) => move.startsWith('M')) && (
                <p>
                  M turns the middle slice between L and R in the same direction as L. M′ reverses
                  it; M2 is a half turn. Keep the outer faces still.
                </p>
              )}
              {action.moves.some((m) => m.startsWith('E')) && (
                <p>
                  E turns the middle slice between U and D in the direction of D; E′ reverses it and
                  E2 is a half turn.
                </p>
              )}
              {action.moves.some((m) => m.startsWith('S')) && (
                <p>
                  S turns the middle slice between F and B in the direction of F; S′ reverses it and
                  S2 is a half turn.
                </p>
              )}
              {action.moves.some((m) => m.includes('w')) && (
                <p>
                  A w move turns the named outer face and the adjacent inner slice together. Follow
                  the moving centers; the camera view does not change the holding frame.
                </p>
              )}
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
            <h3>{player?.timeline.completion.title}</h3>
            <p>{player?.timeline.completion.description}</p>
          </div>
        ) : (
          <p>Choose a stage or press Play.</p>
        )}
      </aside>
    </div>
  );
}
