import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type VideoAsset = { url: string; bytes: number; sha256: string };

export async function prepareGuideVideo(asset: VideoAsset, target: string) {
  const matches = (data: Uint8Array) =>
    data.byteLength === asset.bytes &&
    createHash('sha256').update(data).digest('hex') === asset.sha256;
  try {
    if (matches(await readFile(target))) return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const response = await fetch(asset.url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Guide video download failed: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  if (!matches(data))
    throw new Error('Guide video verification failed: unexpected size or SHA-256');
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, data);
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

if (import.meta.main) {
  const asset: VideoAsset = JSON.parse(
    await readFile(new URL('./guide-video.json', import.meta.url), 'utf8'),
  );
  await prepareGuideVideo(
    asset,
    fileURLToPath(
      new URL('../../public/club-guide-video/club-guide-video-v3.mp4', import.meta.url),
    ),
  );
  console.log('Guide video verified.');
}
