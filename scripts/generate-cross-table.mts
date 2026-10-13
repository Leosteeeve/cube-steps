import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generateCrossTable } from '../src/methods/advanced/cross/generate.ts';
const base = new URL('../src/methods/advanced/cross/', import.meta.url);
const table = generateCrossTable();
const manifest = {
  schema: 1,
  coordinateVersion: 1,
  goalIndex: table.goalIndex,
  byteLength: table.distances.length,
  sha256: createHash('sha256').update(table.distances).digest('hex'),
};
const serialized = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--verify')) {
  const bytes = await readFile(new URL('distance-v1.bin', base)),
    meta = await readFile(new URL('distance-manifest.json', base), 'utf8');
  if (
    !bytes.equals(Buffer.from(table.distances)) ||
    JSON.stringify(JSON.parse(meta)) !== JSON.stringify(manifest)
  )
    throw new Error('Committed cross asset differs from reproducible generation.');
  console.log(`Verified ${bytes.length} cross states; SHA-256 ${manifest.sha256}.`);
} else {
  await writeFile(new URL('distance-v1.bin', base), table.distances);
  await writeFile(new URL('distance-manifest.json', base), serialized);
  console.log(
    `Generated ${table.distances.length} cross states, maximum distance ${Math.max(...new Set(table.distances))}.`,
  );
}
