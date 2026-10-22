import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadRouxAssets, validateRouxAssets } from './assets';
import { loadTestRouxAssets } from '../../../tests/helpers/roux';
it('loads verified assets whose shared lookup data cannot be mutated', async () => {
  const assets = await loadTestRouxAssets();
  expect(validateRouxAssets(assets)).toBe(assets);
  expect(() => {
    assets.blockPolicies.tables[0].rank[0] = 99;
  }).toThrow();
  expect(() => {
    (assets.lse as { version: number }).version = 99;
  }).toThrow();
  expect(() =>
    validateRouxAssets({ ...assets, blockPolicies: { ...assets.blockPolicies, version: 99 } }),
  ).toThrow();
  expect(() => validateRouxAssets(structuredClone(assets))).toThrow();
});
it.each(['truncated', 'hash'] as const)(
  'rejects %s assets before admitting a solve',
  async (mode) => {
    const fetcher = vi.fn(async (input) => {
      const file = String(input).includes('block-policies')
        ? 'block-policies.json'
        : 'lse-policies.bin';
      let bytes = new Uint8Array(readFileSync('src/methods/roux/data/' + file));
      if (file.endsWith('.bin')) {
        if (mode === 'truncated') bytes = bytes.slice(0, 10);
        else bytes[bytes.length - 1] ^= 1;
      }
      return new Response(bytes);
    });
    await expect(loadRouxAssets(fetcher as typeof fetch)).rejects.toThrow(/length|integrity/);
  },
);
it('honors abort before requesting data and after receiving data', async () => {
  const abort = new AbortController();
  abort.abort();
  const fetcher = vi.fn();
  await expect(loadRouxAssets(fetcher, abort.signal)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  const during = new AbortController();
  await expect(
    loadRouxAssets(
      (async () => {
        during.abort();
        return new Response(new Uint8Array());
      }) as typeof fetch,
      during.signal,
    ),
  ).rejects.toThrow();
});
