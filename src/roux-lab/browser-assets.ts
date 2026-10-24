import { loadAdvancedRouxAssets, type AdvancedRouxAssets } from '../methods/roux-advanced/assets';
let pending: Promise<AdvancedRouxAssets> | undefined;
/** Lazy, bounded, reusable playback/archival assets; a failed attempt can be retried. */
export function loadRouxLabAssets(): Promise<AdvancedRouxAssets> {
  return (pending ??= new Promise<AdvancedRouxAssets>((resolve, reject) => {
    const abort = new AbortController(),
      timer = setTimeout(() => {
        abort.abort();
        reject(Error('Roux Lab assets timed out. Retry loading.'));
      }, 30000);
    void loadAdvancedRouxAssets(fetch, abort.signal)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  }).catch((e) => {
    pending = undefined;
    throw e;
  }));
}
