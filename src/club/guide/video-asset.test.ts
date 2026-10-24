import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { prepareGuideVideo } from '../../../scripts/tutorial/prepare-guide-video.mts';

it('rejects altered media before installation, then reuses a verified local copy offline', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'guide-video-'));
  let body = 'bad';
  let requests = 0;
  const server = createServer((_req, res) => {
    requests++;
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  const asset = {
    url: `http://127.0.0.1:${address.port}/video.mp4`,
    bytes: 3,
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  };
  const target = join(dir, 'video.mp4');
  try {
    await expect(prepareGuideVideo(asset, target)).rejects.toThrow(/verification/);
    await expect(readFile(target)).rejects.toThrow();
    body = 'abc';
    await prepareGuideVideo(asset, target);
    expect(await readFile(target, 'utf8')).toBe('abc');
    body = 'bad';
    await prepareGuideVideo(asset, target);
    expect(requests).toBe(2);
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});

it('preserves the prior local file when a same-size replacement has the wrong checksum', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'guide-video-corrupt-'));
  const server = createServer((_req, res) => res.end('bad'));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  const target = join(dir, 'video.mp4');
  try {
    await writeFile(target, 'prior verified version');
    await expect(
      prepareGuideVideo(
        {
          url: `http://127.0.0.1:${address.port}/video.mp4`,
          bytes: 3,
          sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        },
        target,
      ),
    ).rejects.toThrow(/verification/);
    expect(await readFile(target, 'utf8')).toBe('prior verified version');
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
