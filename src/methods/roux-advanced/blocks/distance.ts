import type { CubeEngine, CubeState } from '../../../core/types';
import type { RouxFrame } from '../types';
import { BLOCK_COORDINATES, readFirstBlockCoordinate } from './coordinates';
import manifest from '../data/manifest.json';
export interface BlockSearchAssets {
  readonly coordinateVersion: 1;
  readonly moveSetVersion: 'roux-stm-v1';
  readonly distances: Uint8Array;
  readonly digest: string;
}
const admitted = new WeakSet<object>();
export function assertBlockSearchAssets(assets: BlockSearchAssets): void {
  if (
    !admitted.has(assets) ||
    assets.coordinateVersion !== 1 ||
    assets.moveSetVersion !== 'roux-stm-v1' ||
    assets.digest !== manifest.sha256
  )
    throw Error('Roux block assets have not passed integrity verification.');
}
export async function validateBlockSearchBytes(
  bytes: Uint8Array,
  meta = manifest,
): Promise<BlockSearchAssets> {
  if (meta.schema !== 1 || meta.coordinateVersion !== 1 || meta.moveSetVersion !== 'roux-stm-v1')
    throw Error('Unsupported Roux block asset version.');
  if (bytes.length !== BLOCK_COORDINATES || meta.bytes !== BLOCK_COORDINATES)
    throw Error('Invalid Roux block asset length.');
  const copy = Uint8Array.from(bytes);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', copy)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== manifest.sha256 || meta.sha256 !== manifest.sha256)
    throw Error('Roux block asset integrity check failed.');
  const assets: BlockSearchAssets = Object.freeze({
    coordinateVersion: 1,
    moveSetVersion: 'roux-stm-v1',
    distances: copy,
    digest,
  });
  admitted.add(assets);
  return assets;
}
export async function loadBlockSearchAssets(
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<BlockSearchAssets> {
  const { default: url } = await import('../data/block-distance.bin?url');
  signal?.throwIfAborted();
  const response = await fetcher(url, { signal });
  if (!response.ok) throw Error(`Roux block assets could not load (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  signal?.throwIfAborted();
  const assets = await validateBlockSearchBytes(bytes);
  signal?.throwIfAborted();
  return assets;
}
export function firstBlockLowerBound(
  engine: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
  assets: BlockSearchAssets,
): number {
  assertBlockSearchAssets(assets);
  const value = assets.distances[readFirstBlockCoordinate(engine, state, frame)];
  if (value === 255) throw Error('Unreachable Roux block projection.');
  return value;
}
