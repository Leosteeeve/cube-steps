import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGuidanceAction, useGuidanceScope, useGuidanceTarget } from '../../ui/guidance';
import type { CubeEngine } from '../../core/types';
import { stateToFacelets } from '../../core/facelets';
import { useSystemReducedMotion } from '../../ui/use-system-reduced-motion';
import { describeNotation, type NotationSelection } from './catalog';
import { buildNotationDemo } from './demonstration';
import { createNotationController } from './controller';
import { notationCamera, type NotationCameraMode } from './camera';
import { createNotationAdapter, type NotationRenderer } from './cubing-adapter';
import { NotationNet } from './NotationNet';
import { DirectionGuide } from './DirectionGuide';
import './moves.css';

export function NotationPlayer({
  engine,
  selection,
}: {
  engine: CubeEngine;
  selection: NotationSelection;
}) {
  const demo = useMemo(
    () => buildNotationDemo(engine, selection),
    [engine, selection.base, selection.amount],
  );
  const controller = useMemo(() => createNotationController(demo), [engine]);
  const [snapshot, setSnapshot] = useState(controller.snapshot),
    [mode, setMode] = useState<NotationCameraMode>('holding'),
    [retry, setRetry] = useState(0);
  const host = useRef<HTMLDivElement>(null),
    renderer = useRef<NotationRenderer | null>(null),
    camera = useRef(notationCamera(demo.entry, mode));
  camera.current = notationCamera(demo.entry, mode);
  const emit = useGuidanceAction(),
    holdingTarget = useGuidanceTarget('moves.holding'),
    directionTarget = useGuidanceTarget('moves.direction'),
    tokenTarget = useGuidanceTarget('moves.token');
  const currentMode = useRef(mode);
  currentMode.current = mode;
  const pendingRestore = useRef<{ move: string; progress: number; speed: 0.5 | 1 } | null>(null);
  const reduced = useSystemReducedMotion();
  useLayoutEffect(
    () =>
      controller.subscribe((value) => {
        renderer.current?.setProgress(value.progress);
        setSnapshot(value);
      }),
    [controller],
  );
  useLayoutEffect(() => {
    controller.setReducedMotion(reduced);
  }, [controller, reduced]);
  useLayoutEffect(() => {
    if (!host.current) return;
    renderer.current = null;
    const version =
      controller.snapshot().demo === demo && retry === 0
        ? controller.snapshot().version
        : controller.select(demo);
    const abort = new AbortController();
    if (pendingRestore.current && pendingRestore.current.move !== demo.move)
      pendingRestore.current = null;
    let local: NotationRenderer | undefined;
    const failure = (message: string) => {
      if (abort.signal.aborted || controller.snapshot().version !== version) return;
      controller.fail(version, message);
      local?.dispose();
      if (renderer.current === local) renderer.current = null;
    };
    createNotationAdapter(host.current, demo, {
      signal: abort.signal,
      camera: camera.current,
      onError: failure,
    })
      .then((adapter) => {
        local = adapter;
        if (
          abort.signal.aborted ||
          controller.snapshot().version !== version ||
          controller.snapshot().phase === 'error'
        ) {
          adapter.dispose();
          return;
        }
        renderer.current = adapter;
        adapter.setCamera(camera.current);
        controller.ready(version, adapter.durationMs);
        if (pendingRestore.current?.move === demo.move) {
          const saved = pendingRestore.current;
          pendingRestore.current = null;
          controller.restorePaused(saved);
        }
      })
      .catch((error) =>
        failure(error instanceof Error ? error.message : 'The animation could not be loaded.'),
      );
    return () => {
      abort.abort();
      local?.dispose();
      if (renderer.current === local) renderer.current = null;
    };
  }, [controller, demo, retry]);
  useGuidanceScope(
    'notation-player',
    useCallback(() => {
      controller.pause();
      const saved = controller.snapshot(),
        savedMode = currentMode.current;
      let live = true;
      return {
        restore() {
          if (!live) return;
          controller.pause();
          setMode(savedMode);
          const current = controller.snapshot();
          if (current.demo.move === saved.demo.move && current.phase !== 'loading') {
            controller.restorePaused(saved);
            renderer.current?.setCamera(notationCamera(saved.demo.entry, savedMode));
          } else
            pendingRestore.current = {
              move: saved.demo.move,
              progress: saved.progress,
              speed: saved.speed,
            };
        },
        dispose() {
          live = false;
        },
      };
    }, [controller]),
  );
  useEffect(() => {
    const pause = () => controller.pause(),
      visibility = () => {
        if (document.hidden) pause();
      };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
      controller.dispose();
    };
  }, [controller]);
  const matching = snapshot.demo === demo,
    ready = matching && !['loading', 'error'].includes(snapshot.phase);
  const progress = matching ? snapshot.progress : 0,
    staticMode = reduced || !!snapshot.error;
  const playTarget = useGuidanceTarget('moves.play', ready && !staticMode);
  const boundary = progress === 1 ? demo.final : demo.initial,
    centers = engine.observe(boundary).centers;
  const description = describeNotation(selection);
  const status =
    !matching || snapshot.phase === 'loading'
      ? 'Loading example…'
      : snapshot.error
        ? 'Static diagrams available'
        : staticMode
          ? `Reduced motion: showing ${progress === 1 ? 'After' : 'Before'}.`
          : snapshot.phase === 'complete'
            ? 'Move complete. Replay to try again.'
            : snapshot.phase === 'playing'
              ? 'Turning…'
              : snapshot.phase === 'paused'
                ? 'Paused. Continue when you are ready.'
                : 'Ready to explore';
  function changeCamera(next: NotationCameraMode) {
    controller.pause();
    setMode(next);
    renderer.current?.setCamera(notationCamera(demo.entry, next));
  }
  return (
    <div
      className="notation-player"
      data-notation-move={demo.move}
      data-phase={matching ? snapshot.phase : 'loading'}
      data-progress={progress}
      data-boundary-state={JSON.stringify(boundary.data)}
    >
      <section className="notation-stage" aria-label="Move demonstration">
        <div className="notation-stage-top">
          <span role="status">{status}</span>
          <span>{demo.entry.name}</span>
        </div>
        <div className="notation-visual">
          <div
            className="notation-canvas"
            ref={host}
            hidden={staticMode}
            onPointerDown={() => controller.pause()}
          />
          {staticMode && (
            <NotationNet
              facelets={stateToFacelets(boundary)}
              label={`${progress === 1 ? 'After' : 'Before'} ${description.display}`}
            />
          )}
        </div>
        <p ref={holdingTarget} className="notation-holding" aria-label="Current holding">
          {centers.U} up · {centers.F} front
          {progress > 0 && progress < 1 ? ' · last completed position' : ''}
        </p>
        <div
          ref={directionTarget}
          className="notation-camera"
          role="group"
          aria-label="Observation viewpoint"
        >
          <button
            type="button"
            aria-pressed={mode === 'holding'}
            onClick={() => changeCamera('holding')}
          >
            Holding view
          </button>
          <button
            type="button"
            aria-pressed={mode === 'direction'}
            onClick={() => changeCamera('direction')}
          >
            Direction view
          </button>
          <button type="button" onClick={() => changeCamera(mode)}>
            Reset view
          </button>
        </div>
        <p className="notation-camera-note">
          Changing the camera only helps you look. It does not turn your cube.
        </p>
        {snapshot.error && (
          <div role="alert" className="notation-error">
            <p>{snapshot.error}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>
              Retry animation
            </button>
          </div>
        )}
        <div className="notation-controls">
          {staticMode ? (
            <div role="group" aria-label="Static endpoints">
              <button
                type="button"
                disabled={!matching || snapshot.phase === 'loading'}
                aria-pressed={progress === 0}
                onClick={() => controller.showEndpoint('before')}
              >
                Before
              </button>
              <button
                type="button"
                disabled={!matching || snapshot.phase === 'loading'}
                aria-pressed={progress === 1}
                onClick={() => controller.showEndpoint('after')}
              >
                After
              </button>
            </div>
          ) : (
            <>
              <button
                className="notation-play"
                ref={snapshot.phase !== 'complete' ? playTarget : undefined}
                type="button"
                disabled={!ready || snapshot.phase === 'complete'}
                onClick={() => {
                  if (snapshot.phase === 'playing') controller.pause();
                  else {
                    controller.play();
                    if (controller.snapshot().phase === 'playing')
                      emit({ name: 'notation-play', value: demo.move });
                  }
                }}
              >
                {snapshot.phase === 'playing' ? 'Pause move' : 'Play move'}
              </button>
              <button
                ref={snapshot.phase === 'complete' ? playTarget : undefined}
                type="button"
                disabled={!ready}
                onClick={() => {
                  controller.replay();
                  if (controller.snapshot().phase === 'playing')
                    emit({ name: 'notation-play', value: demo.move });
                }}
              >
                Replay
              </button>
            </>
          )}
          <button type="button" onClick={() => controller.reset()}>
            Reset
          </button>
          {!staticMode && (
            <label>
              Speed{' '}
              <select
                aria-label="Move speed"
                value={snapshot.speed}
                onChange={(event) => controller.setSpeed(Number(event.target.value) as 0.5 | 1)}
              >
                <option value="0.5">Slow</option>
                <option value="1">Normal</option>
              </select>
            </label>
          )}
        </div>
        <div className="notation-progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </section>
      <aside className="notation-explanation" aria-label="Move meaning">
        <p className="eyebrow">READ THE MOVE</p>
        <h2 ref={tokenTarget} aria-label="Selected move">
          {description.display}
        </h2>
        <p className="notation-name">
          {demo.entry.name}
          {selection.amount === "'"
            ? ' · counterclockwise'
            : selection.amount === '2'
              ? ' · half turn'
              : ' · clockwise'}
        </p>
        <p>{description.instruction}</p>
        <p>{demo.entry.layerText}</p>
        <DirectionGuide selection={selection} />
        <p className="notation-start">
          Starting grip: white up · green front. Every example resets to this solved position.
        </p>
        <p>Letters follow your physical hold, not a permanent sticker color.</p>
      </aside>
    </div>
  );
}
