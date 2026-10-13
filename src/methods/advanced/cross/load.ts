import type { CrossTable } from './table';
import assetUrl from './distance-v1.bin?url';
import manifest from './distance-manifest.json';
import { CROSS_STATE_COUNT, CROSS_GOAL, rankCross } from './coordinates';
export async function loadCrossTable(
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<CrossTable> {
  signal?.throwIfAborted();
  if (
    manifest.schema !== 1 ||
    manifest.coordinateVersion !== 1 ||
    manifest.byteLength !== CROSS_STATE_COUNT ||
    manifest.goalIndex !== rankCross(CROSS_GOAL)
  )
    throw new Error('Shortest-cross asset version is incompatible.');
  const response = await fetcher(assetUrl, { signal });
  if (!response.ok)
    throw new Error(
      `Shortest-cross asset could not load (${response.status}). Please reload and try again.`,
    );
  const buffer = await response.arrayBuffer();
  signal?.throwIfAborted();
  if (buffer.byteLength !== manifest.byteLength)
    throw new Error('Shortest-cross asset has an invalid byte length.');
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const hash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
  signal?.throwIfAborted();
  if (hash !== manifest.sha256)
    throw new Error(
      'Shortest-cross asset failed its integrity check. Please reload and try again.',
    );
  return { version: 1, goalIndex: manifest.goalIndex, distances: new Uint8Array(buffer) };
}
