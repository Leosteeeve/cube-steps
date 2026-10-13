import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { loadCrossTable } from './load';
import manifest from './distance-manifest.json';
it('rejects_corrupt_or_stale_cross_asset', async () => {
  const wrongLength = async () => new Response(new Uint8Array(4));
  await expect(loadCrossTable(wrongLength as typeof fetch)).rejects.toThrow(
    /cross.*(length|asset)/i,
  );
  const wrongDigest = async () => new Response(new Uint8Array(190080).fill(3));
  await expect(loadCrossTable(wrongDigest as typeof fetch)).rejects.toThrow(
    /cross.*(integrity|digest|asset)/i,
  );
  await expect(
    loadCrossTable((async () => new Response(null, { status: 404 })) as typeof fetch),
  ).rejects.toThrow(/cross.*(404|asset)/i);
  const abort = new AbortController();
  abort.abort();
  await expect(loadCrossTable(wrongDigest as typeof fetch, abort.signal)).rejects.toThrow(/abort/i);
});
it('loads_the_committed_version_and_rejects_a_same_length_mutation', async () => {
  const bytes = new Uint8Array(await readFile(new URL('./distance-v1.bin', import.meta.url)));
  const table = await loadCrossTable((async () => new Response(bytes.slice())) as typeof fetch);
  expect(table.distances).toEqual(bytes);
  bytes[100] ^= 1;
  await expect(loadCrossTable((async () => new Response(bytes)) as typeof fetch)).rejects.toThrow(
    /integrity|digest/i,
  );
});
it('rejects_incompatible_manifest_before_fetching', async () => {
  const original = manifest.coordinateVersion;
  try {
    manifest.coordinateVersion = 999;
    await expect(
      loadCrossTable((async () => {
        throw new Error('Fetch must not start for a stale schema.');
      }) as typeof fetch),
    ).rejects.toThrow(/version.*incompatible/i);
  } finally {
    manifest.coordinateVersion = original;
  }
});
