import { loadRouxAssets, type RouxAssets } from '../roux/assets';
import { loadBlockSearchAssets, type BlockSearchAssets } from './blocks/distance';
import { loadAdvancedLseAssets, type AdvancedLseAssets, ADVANCED_LSE_BYTES } from './lse/assets';
import { CMLL_CATALOG, cmllDigest } from './cmll/catalog';
import type { CmllCatalog } from './cmll/types';
import { ROUX_EXECUTION_CATALOG } from './execution/catalog';
import type { RouxExecutionCatalog } from './execution/types';
import { freezeLabValue } from '../../lab/input';
import beginnerManifest from '../roux/data/manifest.json';
export interface AdvancedRouxAssets {
  blocks: BlockSearchAssets;
  beginner: RouxAssets;
  cmll: CmllCatalog;
  lse: AdvancedLseAssets;
  execution: RouxExecutionCatalog;
  version: string;
}
const admitted = new WeakSet<object>();
export function assertAdvancedRouxAssets(assets: AdvancedRouxAssets): void {
  if (!admitted.has(assets))
    throw Error('Advanced Roux assets have not passed integrity verification.');
}
/** Conservative retained size, including the public/private LSE copies and parsed JSON. */
export function advancedRouxAssetBytes(a: AdvancedRouxAssets): number {
  return (
    2 * a.blocks.distances.byteLength +
    2 * ADVANCED_LSE_BYTES +
    beginnerManifest.lse.bytes * 2 +
    beginnerManifest.block.bytes * 8 +
    JSON.stringify(a.cmll).length * 4 +
    JSON.stringify(a.execution).length * 4
  );
}
export async function loadAdvancedRouxAssets(
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<AdvancedRouxAssets> {
  const [blocks, beginner, lse] = await Promise.all([
    loadBlockSearchAssets(fetcher, signal),
    loadRouxAssets(fetcher, signal),
    loadAdvancedLseAssets(fetcher, signal),
  ]);
  signal.throwIfAborted();
  if (CMLL_CATALOG.digest !== cmllDigest(CMLL_CATALOG)) throw Error('CMLL asset digest mismatch.');
  const assets = {
    blocks,
    beginner,
    lse,
    cmll: CMLL_CATALOG,
    execution: freezeLabValue(ROUX_EXECUTION_CATALOG),
    version: 'advanced-roux-v1',
  };
  if (advancedRouxAssetBytes(assets) > 32 * 1024 * 1024)
    throw Error('Roux static assets exceed 32 MiB.');
  admitted.add(assets);
  return Object.freeze(assets);
}
