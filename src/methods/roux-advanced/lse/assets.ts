import { LSE_DENSE_SIZE } from '../../roux/lse/coordinates';
import manifest from '../data/lse-advanced-manifest.json';
export const ADVANCED_LSE_GOALS = ['eo', 'lr', 'last', 'nearest', 'combined'] as const;
export type AdvancedLseGoal = (typeof ADVANCED_LSE_GOALS)[number];
export interface AdvancedLseAssets {
  version: 1;
  coordinateVersion: 1;
  tables: Uint8Array;
  digest: string;
}
export const ADVANCED_LSE_BYTES = 16 + LSE_DENSE_SIZE * ADVANCED_LSE_GOALS.length * 2;
const storage = new WeakMap<AdvancedLseAssets, Uint8Array>();
export async function validateAdvancedLseBytes(source: Uint8Array): Promise<AdvancedLseAssets> {
  const bytes = source.slice();
  if (
    bytes.length !== ADVANCED_LSE_BYTES ||
    manifest.schema !== 1 ||
    manifest.coordinateVersion !== 1 ||
    manifest.bytes !== bytes.length
  )
    throw Error('Invalid advanced LSE length or version.');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== manifest.sha256) throw Error('Advanced LSE integrity check failed.');
  const view = new DataView(bytes.buffer);
  if ([0x414c5352, 1, LSE_DENSE_SIZE, 184320].some((v, i) => view.getUint32(i * 4, true) !== v))
    throw Error('Invalid advanced LSE header.');
  const assets: AdvancedLseAssets = Object.freeze({
    version: 1,
    coordinateVersion: 1,
    tables: bytes.slice(),
    digest,
  });
  storage.set(assets, bytes);
  return assets;
}
export function readLsePolicy(
  assets: AdvancedLseAssets,
  goal: AdvancedLseGoal,
  index: number,
): { cost: number; next: number } {
  const data = storage.get(assets),
    g = ADVANCED_LSE_GOALS.indexOf(goal);
  if (!data) throw Error('Unadmitted advanced LSE assets.');
  if (!Number.isInteger(index) || index < 0 || index >= LSE_DENSE_SIZE || g < 0)
    throw Error('Invalid advanced LSE lookup.');
  const offset = 16 + g * 2 * LSE_DENSE_SIZE;
  return { cost: data[offset + index], next: data[offset + LSE_DENSE_SIZE + index] };
}
export async function loadAdvancedLseAssets(
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<AdvancedLseAssets> {
  signal?.throwIfAborted();
  const { default: url } = await import('../data/lse-advanced.bin?url');
  const response = await fetcher(url, { signal });
  if (!response.ok) throw Error('Advanced LSE tables could not load.');
  const result = await validateAdvancedLseBytes(new Uint8Array(await response.arrayBuffer()));
  signal?.throwIfAborted();
  return result;
}
