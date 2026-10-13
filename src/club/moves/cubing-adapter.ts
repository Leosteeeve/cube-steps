import type { ExperimentalMillisecondTimestamp } from 'cubing/twisty';
import { CENTER_SLOTS, CORNER_SLOTS, EDGE_SLOTS } from '../../core/observations';
import type { NotationDemo } from './demonstration';
import type { NotationCameraPreset } from './camera';
export interface NotationRenderer {
  durationMs: number;
  setProgress(progress: number): void;
  setCamera(preset: NotationCameraPreset): void;
  dispose(): void;
}
export async function createNotationAdapter(
  host: HTMLElement,
  demo: NotationDemo,
  options: { signal: AbortSignal; camera: NotationCameraPreset; onError(message: string): void },
): Promise<NotationRenderer> {
  const checkAbort = () => {
    if (options.signal.aborted) throw new DOMException('The example was replaced.', 'AbortError');
  };
  checkAbort();
  const probe = document.createElement('canvas'),
    gl = probe.getContext('webgl2');
  if (!gl)
    throw new Error('3D animation is unavailable. Explore the Before and After diagrams instead.');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const { TwistyPlayer } = await import('cubing/twisty');
  checkAbort();
  const player = new TwistyPlayer({
    puzzle: '3x3x3',
    alg: demo.move,
    experimentalSetupAlg: '',
    experimentalSetupAnchor: 'start',
    controlPanel: 'none',
    background: 'none',
    hintFacelets: 'none',
    viewerLink: 'none',
    cameraLatitude: options.camera.latitude,
    cameraLongitude: options.camera.longitude,
    cameraLatitudeLimit: 90,
    experimentalDragInput: 'auto',
  });
  player.indexer = 'simple';
  player.timestamp = 0 as ExperimentalMillisecondTimestamp;
  player.style.width = '100%';
  player.style.height = '100%';
  let disposed = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const contexts: EventTarget[] = [player];
  const loss = (event: Event) => {
    event.preventDefault();
    if (!disposed) options.onError('3D rendering stopped. Use the diagrams or retry animation.');
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    options.signal.removeEventListener('abort', dispose);
    contexts.forEach((target) => target.removeEventListener('webglcontextlost', loss));
    player.pause();
    player.remove();
  };
  options.signal.addEventListener('abort', dispose, { once: true });
  player.addEventListener('webglcontextlost', loss);
  host.replaceChildren(player);
  let abortReady: () => void = () => {};
  try {
    const preparation = async () => {
      const indexer = await player.experimentalModel.indexer.get();
      checkAbort();
      const vantages = await player.experimentalCurrentVantages();
      checkAbort();
      await Promise.all(
        [...vantages].map(async (vantage) => {
          const renderer = await vantage.renderer();
          checkAbort();
          if (disposed) return;
          const canvas = renderer.domElement;
          if (!contexts.includes(canvas)) {
            contexts.push(canvas);
            canvas.addEventListener('webglcontextlost', loss);
          }
          await new Promise<void>((resolve) => {
            vantage.experimentalNextRenderFinishedCallback(resolve);
            vantage.scheduleRender();
          });
        }),
      );
      return indexer.algDuration();
    };
    const aborted = new Promise<never>((_, reject) => {
      abortReady = () => reject(new DOMException('The example was replaced.', 'AbortError'));
      options.signal.addEventListener('abort', abortReady, { once: true });
    });
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('The animation took too long to load. Please retry.')),
        15000,
      );
    });
    const durationMs = await Promise.race([preparation(), aborted, timeout]);
    checkAbort();
    if (disposed) throw new Error('The animation was disposed.');
    clearTimeout(timer);
    const axisFaces = ({ x: ['L', 'R'], y: ['D', 'U'], z: ['B', 'F'] } as const)[demo.entry.axis];
    const mask = (slots: readonly string[], count: number) => ({
      pieces: slots.map((slot) => ({
        facelets: Array(count).fill(
          demo.entry.layers.includes(
            slot.includes(axisFaces[1]) ? 1 : slot.includes(axisFaces[0]) ? -1 : 0,
          )
            ? 'regular'
            : 'dim',
        ),
      })),
    });
    player.experimentalStickeringMaskOrbits = {
      orbits: {
        EDGES: mask(EDGE_SLOTS, 2),
        CORNERS: mask(CORNER_SLOTS, 3),
        CENTERS: mask(CENTER_SLOTS, 1),
      },
    };
    return {
      durationMs,
      setProgress(progress) {
        if (!disposed && Number.isFinite(progress))
          player.timestamp = (Math.max(0, Math.min(1, progress)) *
            durationMs) as ExperimentalMillisecondTimestamp;
      },
      setCamera(preset) {
        if (disposed) return;
        player.cameraLatitude = preset.latitude;
        player.cameraLongitude = preset.longitude;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  } finally {
    options.signal.removeEventListener('abort', abortReady);
  }
}
