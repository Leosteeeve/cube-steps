import type { MethodRuntime } from '../contracts';
import { registerMethodRuntime } from '../registry';
import { loadRouxAssets, validateRouxAssets, type RouxAssets } from './assets';
import { createRouxRuntime } from './definition';

export function createRouxPlaybackLoader(
  load: (signal: AbortSignal) => Promise<RouxAssets> = (signal) => loadRouxAssets(fetch, signal),
) {
  let pending: Promise<MethodRuntime> | undefined;
  async function loadWithDeadline() {
    const controller = new AbortController();
    let timer!: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = Error('Roux playback loading timed out. Please try again.');
        controller.abort(error);
        reject(error);
      }, 30000);
    });
    try {
      // Abort stops fetch; the race also bounds a dynamic import or loader
      // that cannot consume the signal. A late result never replaces a retry.
      return await Promise.race([load(controller.signal), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }
  return () =>
    (pending ??= Promise.resolve()
      .then(loadWithDeadline)
      .then((assets) => createRouxRuntime(validateRouxAssets(assets)))
      .catch((error) => {
        pending = undefined;
        throw error;
      }));
}

const loadPlayback = createRouxPlaybackLoader();
export async function prepareRouxPlayback(): Promise<MethodRuntime> {
  const runtime = await loadPlayback();
  registerMethodRuntime(runtime);
  return runtime;
}
