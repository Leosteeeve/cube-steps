import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyGuideManifest } from '../../scripts/tutorial/capture-contract.mts';
import type { GuideScreenshot } from '../../src/club/guide/types';
const roots: string[] = [];
afterEach(async () => {
  for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'guide-contract-'));
  roots.push(root);
  await mkdir(join(root, 'club-guide'));
  const png = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
  png.writeUInt32BE(100, 16);
  png.writeUInt32BE(80, 20);
  await writeFile(join(root, 'club-guide', 'timer.png'), png);
  return root;
}
const image: GuideScreenshot = {
  id: 'timer',
  src: 'club-guide/timer.png',
  alt: 'Timer',
  caption: 'Example results.',
  route: 'club/#/timer',
  width: 100,
  height: 80,
  sourceRevision: 'fabe1d88482875ab8cb63ebd8b548b9c3a04b185',
  scenario: 'timer',
  exampleData: true,
};
it('accepts a complete manifest and rejects missing, duplicate, traversal, metadata and mislabeled examples', async () => {
  const root = await setup();
  expect(await verifyGuideManifest({ version: 1, images: [image] }, root)).toEqual([]);
  const errors = await verifyGuideManifest(
    {
      version: 1,
      images: [
        { ...image, src: '../secret.png', caption: 'Timer' },
        image,
        { ...image, id: 'absent', src: 'club-guide/missing.png' },
        { ...image, id: 'size', width: 101 },
        { ...image, id: 'alt', alt: '' },
      ],
    },
    root,
  );
  expect(errors).toContain('timer: unsupported path');
  expect(errors).toContain('timer: example caption required');
  expect(errors).toContain('timer: duplicate id');
  expect(errors).toContain('absent: missing image');
  expect(errors).toContain('size: dimensions do not match PNG');
  expect(errors).toContain('alt: alt required');
});
it('rejects uncaptured revision placeholders', async () => {
  const root = await setup();
  expect(
    await verifyGuideManifest(
      { version: 1, images: [{ ...image, sourceRevision: 'uncommitted' }] },
      root,
    ),
  ).toContain('timer: invalid source revision');
});
