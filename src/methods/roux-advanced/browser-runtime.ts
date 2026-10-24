import type { MethodRuntime } from '../contracts';
import type { RouxFrameId } from './types';
import { ROUX_FRAMES } from './frames';
import { registerMethodPresentation, registerAdvancedRouxFrameRuntime } from '../registry';
import { ADVANCED_ROUX_PRESENTATION } from './presentation';
import { createAdvancedRouxRuntime } from './definition';
import {
  loadAdvancedRouxAssets,
  assertAdvancedRouxAssets,
  type AdvancedRouxAssets,
} from './assets';
export function createAdvancedRouxPlaybackLoader(
  load: (signal: AbortSignal) => Promise<AdvancedRouxAssets> = (signal) =>
    loadAdvancedRouxAssets(fetch, signal),
) {
  let pending: Promise<AdvancedRouxAssets> | undefined;
  const runtimes = new Map<RouxFrameId, MethodRuntime>();
  async function loadBounded() {
    const controller = new AbortController();
    let timer!: ReturnType<typeof setTimeout>;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Error('Advanced Roux playback loading timed out. Please retry.'));
        }, 30000);
      });
      const assets = await Promise.race([load(controller.signal), deadline]);
      assertAdvancedRouxAssets(assets);
      return assets;
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    get: (id: RouxFrameId) => runtimes.get(id),
    async prepare(id: RouxFrameId): Promise<MethodRuntime> {
      if (!ROUX_FRAMES.some((f) => f.id === id))
        throw Error('Choose a supported Advanced Roux frame.');
      const existing = runtimes.get(id);
      if (existing) return existing;
      const assets = await (pending ??= Promise.resolve()
        .then(loadBounded)
        .catch((error) => {
          pending = undefined;
          throw error;
        }));
      let runtime = runtimes.get(id);
      if (!runtime) {
        runtime = createAdvancedRouxRuntime(assets, id);
        runtimes.set(id, runtime);
      }
      return runtime;
    },
  };
}
const playback = createAdvancedRouxPlaybackLoader();
export async function prepareAdvancedRouxPlayback(frameId: RouxFrameId): Promise<MethodRuntime> {
  const runtime = await playback.prepare(frameId);
  registerMethodPresentation(ADVANCED_ROUX_PRESENTATION);
  registerAdvancedRouxFrameRuntime(frameId, runtime);
  return runtime;
}
export const getPreparedAdvancedRouxRuntime = (frameId: RouxFrameId) => playback.get(frameId);
