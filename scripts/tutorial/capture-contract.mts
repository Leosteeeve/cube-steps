import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import type { GuideScreenshot } from '../../src/club/guide/types.ts';
export function actualGuideCaptureRoute(
  baseUrl: string,
  pageUrl: string,
  expected: string,
): string {
  const base = new URL(baseUrl),
    actual = new URL(pageUrl);
  if (actual.origin !== base.origin || !actual.pathname.startsWith(base.pathname))
    throw Error('Capture left the intended website.');
  const route = actual.pathname.slice(base.pathname.length) + actual.search + actual.hash;
  if (route !== expected)
    throw Error(`Capture route mismatch: expected ${expected}, received ${route}`);
  return route;
}
export async function verifyGuideManifest(
  manifest: { version: 1; images: GuideScreenshot[] },
  assetRoot: string,
): Promise<string[]> {
  const errors: string[] = [],
    ids = new Set<string>(),
    paths = new Set<string>(),
    root = await realpath(assetRoot);
  if (manifest.version !== 1 || !Array.isArray(manifest.images))
    return ['Unsupported screenshot manifest'];
  for (const image of manifest.images) {
    const { id, src } = image;
    if (ids.has(id)) errors.push(`${id}: duplicate id`);
    ids.add(id);
    if (paths.has(src)) errors.push(`${id}: duplicate asset`);
    paths.add(src);
    for (const field of ['id', 'alt', 'caption', 'sourceRevision', 'scenario', 'route'] as const)
      if (!image[field]?.trim()) errors.push(`${id}: ${field} required`);
    if (!/^[a-f0-9]{40}(?:-dirty)?$/.test(image.sourceRevision))
      errors.push(`${id}: invalid source revision`);
    if (image.exampleData && !/example|sample/i.test(image.caption))
      errors.push(`${id}: example caption required`);
    if (!/^club-guide\/[a-z0-9-]+\.png$/.test(src)) {
      errors.push(`${id}: unsupported path`);
      continue;
    }
    if (
      !Number.isInteger(image.width) ||
      !Number.isInteger(image.height) ||
      image.width < 1 ||
      image.height < 1
    )
      errors.push(`${id}: invalid dimensions`);
    try {
      const target = await realpath(resolve(root, src)),
        rel = relative(root, target);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        errors.push(`${id}: unsupported path`);
        continue;
      }
      const bytes = await readFile(target);
      if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
        errors.push(`${id}: invalid PNG`);
      else if (bytes.readUInt32BE(16) !== image.width || bytes.readUInt32BE(20) !== image.height)
        errors.push(`${id}: dimensions do not match PNG`);
    } catch {
      errors.push(`${id}: missing image`);
    }
  }
  return errors;
}
