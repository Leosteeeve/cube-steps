import type { MethodRuntime } from '../contracts';
import { registerMethodRuntime } from '../registry';
import { loadRouxAssets, validateRouxAssets, type RouxAssets } from './assets';
import { createRouxRuntime } from './definition';

async function loadBrowserAssets(): Promise<RouxAssets> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(Error('Roux playback loading timed out. Please try again.')),
    30000,
  );
  try {
    return await loadRouxAssets(fetch, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export function createRouxPlaybackLoader(load: () => Promise<RouxAssets> = loadBrowserAssets) {
  let pending: Promise<MethodRuntime> | undefined;
  return () =>
    (pending ??= Promise.resolve()
      .then(load)
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
