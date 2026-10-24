import {
  TwistyPlayer,
  type ExperimentalLeafIndex,
  type ExperimentalMillisecondTimestamp,
} from 'cubing/twisty';
import type { CubeEngine, CubeState, SolveSession } from '../core/types';
import type { CubeViewPreferences } from './view-preferences';
import { buildPlaybackInitialSetup } from './initial-setup';
import type { PlaybackSource } from './playback-source';
import { EDGE_SLOTS, CORNER_SLOTS } from '../core/observations';
import { flattenTrace } from '../methods/shared/trace';
export async function createCubingAdapter(
  host: HTMLElement,
  engine: CubeEngine,
  input: SolveSession | PlaybackSource,
  onRenderFailure?: (error: Error) => void,
) {
  const source: PlaybackSource = 'kind' in input ? input : { kind: 'solve', session: input };
  const setup = buildPlaybackInitialSetup(engine, source);
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl)
    throw new Error('3D rendering is unavailable. You can still read and step through every move.');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const flat =
    source.kind === 'solve'
      ? flattenTrace(source.session.trace)
      : source.kind === 'lab' || source.kind === 'roux-lab'
        ? source.prepared.timeline
        : { moves: source.demonstration.actions.flatMap((a) => a.moves) };
  const player = new TwistyPlayer({
    puzzle: '3x3x3',
    alg: flat.moves.join(' '),
    experimentalSetupAlg: setup.join(' '),
    experimentalSetupAnchor: 'start',
    controlPanel: 'none',
    background: 'none',
    hintFacelets: 'none',
    viewerLink: 'none',
    cameraLatitude: 28,
    cameraLongitude: 32,
    experimentalDragInput: 'auto',
  });
  player.indexer = 'simple';
  player.timestamp = 0 as ExperimentalMillisecondTimestamp;
  player.style.width = '100%';
  player.style.height = '100%';
  host.replaceChildren(player);
  const indexer = await player.experimentalModel.indexer.get();
  const boundaries: number[] = flat.moves.map((_, i) =>
    indexer.indexToMoveStartTimestamp(i as ExperimentalLeafIndex),
  );
  boundaries.push(indexer.algDuration());
  let lastTargets = '',
    lost = false,
    disposed = false,
    rendered = false;
  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  let canvases: HTMLCanvasElement[] = [];
  const fail = (error: Error) => {
    if (disposed || lost) return;
    lost = true;
    player.pause();
    onRenderFailure?.(error);
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    fail(new Error('3D rendering stopped. Continue with the synchronized six-face view below.'));
  };
  // Twisty waits for intersection before creating 3D. Indexer readiness must
  // enable controls independently; only time out rendering after it is visible.
  const visibility = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting) || rendered || disposed) return;
    visibility.disconnect();
    renderTimer = setTimeout(
      () =>
        fail(
          new Error(
            '3D initialization timed out. Continue with the synchronized six-face view below.',
          ),
        ),
      8000,
    );
  });
  visibility.observe(player);
  void player
    .experimentalCurrentThreeJSPuzzleObject()
    .then(async () => {
      const current = await player.experimentalCurrentCanvases();
      if (disposed || lost) return;
      canvases = [...current];
      for (const canvas of canvases) canvas.addEventListener('webglcontextlost', contextLost);
      rendered = true;
      clearTimeout(renderTimer);
      visibility.disconnect();
    })
    .catch((error) => fail(error instanceof Error ? error : new Error('3D rendering failed.')));
  const adapter = {
    boundaries,
    setTimestamp(time: number) {
      if (lost) return;
      player.timestamp = time as ExperimentalMillisecondTimestamp;
    },
    resetView() {
      player.cameraLatitude = 28;
      player.cameraLongitude = 32;
    },
    setViewOptions(options: CubeViewPreferences) {
      player.hintFacelets = options.showBackFaces ? 'floating' : 'none';
    },
    setTargets(ids: readonly string[], _state: CubeState) {
      adapter.highlight(ids);
    },
    highlight(targets: readonly string[]) {
      if (lost) return;
      const key = targets.join(',');
      if (key === lastTargets) return;
      lastTargets = key;
      const orbit = (slots: string[], faces: number) => ({
        pieces: slots.map((id) => ({
          facelets: Array(faces).fill(
            targets.length === 0 || targets.includes(id) ? 'regular' : 'dim',
          ),
        })),
      });
      player.experimentalStickeringMaskOrbits = {
        orbits: {
          EDGES: orbit(EDGE_SLOTS, 2),
          CORNERS: orbit(CORNER_SLOTS, 3),
          CENTERS: { pieces: Array.from({ length: 6 }, () => ({ facelets: ['regular'] })) },
        },
      };
    },
    dispose() {
      disposed = true;
      clearTimeout(renderTimer);
      visibility.disconnect();
      for (const canvas of canvases) canvas.removeEventListener('webglcontextlost', contextLost);
      player.pause();
      player.remove();
    },
  };
  return adapter;
}
