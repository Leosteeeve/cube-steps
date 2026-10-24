import { readFile } from 'node:fs/promises';
import { loadAdvancedRouxAssets } from '../../src/methods/roux-advanced/assets';
export const loadTestAdvancedRouxAssets = () =>
  loadAdvancedRouxAssets(
    (async (url) => {
      const text = String(url),
        advanced =
          text.includes('block-distance') ||
          text.includes('lse-advanced') ||
          text.includes('cmll-catalog');
      const name = text.includes('block-distance')
        ? 'block-distance.bin'
        : text.includes('lse-advanced')
          ? 'lse-advanced.bin'
          : text.includes('cmll-catalog')
            ? 'cmll-catalog.json'
            : text.includes('block-policies')
              ? 'block-policies.json'
              : 'lse-policies.bin';
      return new Response(
        new Uint8Array(
          await readFile(`src/methods/${advanced ? 'roux-advanced' : 'roux'}/data/${name}`),
        ),
      );
    }) as typeof fetch,
    new AbortController().signal,
  );
