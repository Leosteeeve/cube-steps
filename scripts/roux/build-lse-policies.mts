import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const base = new URL('../../src/methods/roux/data/', import.meta.url);
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
try {
  const { createCubeEngine } = (await server.ssrLoadModule(
    '/src/core/cube.ts',
  )) as typeof import('../../src/core/cube.ts');
  const { generateLsePolicies, serializeLseTables } = (await server.ssrLoadModule(
    '/src/methods/roux/lse/policies.ts',
  )) as typeof import('../../src/methods/roux/lse/policies.ts');
  const engine = await createCubeEngine(),
    tables = generateLsePolicies(engine),
    bytes = serializeLseTables(tables),
    blocks = await readFile(new URL('block-policies.json', base));
  const manifest = {
    schema: 1,
    coordinateVersion: 1,
    block: {
      file: 'block-policies.json',
      bytes: blocks.length,
      sha256: hash(blocks),
      catalogDigest: JSON.parse(blocks.toString()).catalogDigest,
    },
    lse: {
      file: 'lse-policies.bin',
      bytes: bytes.length,
      sha256: hash(bytes),
      catalogDigest: tables.catalogDigest,
      domainCount: tables.domainCount,
      coverage: tables.coverage,
    },
  };
  const text = JSON.stringify(manifest, null, 2) + '\n';
  if (process.argv.includes('--verify')) {
    if (
      !Buffer.from(bytes).equals(await readFile(new URL('lse-policies.bin', base))) ||
      (await readFile(new URL('manifest.json', base), 'utf8')) !== text
    )
      throw Error('Roux policy artifacts are stale. Regenerate and review.');
  } else {
    await writeFile(new URL('lse-policies.bin', base), bytes);
    await writeFile(new URL('manifest.json', base), text);
  }
  console.log(JSON.stringify(manifest));
} finally {
  await server.close();
}
