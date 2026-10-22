import { validateBlockPolicies } from './blocks/policies';
import type { RouxBlockPolicies } from './blocks/types';
import { parseLseTables, lseRank, type LseTables } from './lse/policies';
import manifest from './data/manifest.json';
export interface RouxAssets {
  blockPolicies: RouxBlockPolicies;
  lse: LseTables;
}
const admitted = new WeakSet<object>();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function validateRouxAssets(raw: unknown): RouxAssets {
  const r = raw as RouxAssets;
  if (!r || typeof r !== 'object' || !r.blockPolicies || !r.lse)
    throw Error('Missing Roux policy assets.');
  validateBlockPolicies(r.blockPolicies);
  if (
    r.lse.version !== 1 ||
    lseRank(
      r.lse,
      { edges: [0, 1, 2, 3, 4, 5], flips: [0, 0, 0, 0, 0, 0], phase: 0, offset: 0 },
      'solved',
    ) !== 0
  )
    throw Error('Unsupported Roux LSE version or goal.');
  if (!admitted.has(r)) throw Error('Roux assets have not passed their integrity checks.');
  return r;
}
export async function loadRouxAssets(
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<RouxAssets> {
  signal?.throwIfAborted();
  if (manifest.schema !== 1 || manifest.coordinateVersion !== 1)
    throw Error('Roux asset version is incompatible.');
  const [{ default: blockUrl }, { default: lseUrl }] = await Promise.all([
    import('./data/block-policies.json?url'),
    import('./data/lse-policies.bin?url'),
  ]);
  const read = async (url: string, meta: { bytes: number; sha256: string }) => {
    signal?.throwIfAborted();
    const response = await fetcher(url, { signal });
    if (!response.ok) throw Error(`Roux assets could not load (${response.status}). Please retry.`);
    const bytes = await response.arrayBuffer();
    signal?.throwIfAborted();
    if (bytes.byteLength !== meta.bytes) throw Error('Roux asset length is invalid.');
    const digest = await crypto.subtle.digest('SHA-256', bytes),
      hash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
    signal?.throwIfAborted();
    if (hash !== meta.sha256) throw Error('Roux asset integrity check failed. Please reload.');
    return bytes;
  };
  const [blockBytes, lseBytes] = await Promise.all([
    read(blockUrl, manifest.block),
    read(lseUrl, manifest.lse),
  ]);
  const blockPolicies = validateBlockPolicies(JSON.parse(new TextDecoder().decode(blockBytes))),
    lse = parseLseTables(new Uint8Array(lseBytes));
  if (
    blockPolicies.catalogDigest !== manifest.block.catalogDigest ||
    lse.catalogDigest !== manifest.lse.catalogDigest
  )
    throw Error('Roux asset catalog mismatch.');
  const assets = freeze({ blockPolicies, lse });
  admitted.add(assets);
  return validateRouxAssets(assets);
}
