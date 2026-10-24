import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' }),
  base = new URL('../../src/methods/roux-advanced/data/', import.meta.url);
try {
  const { createCubeEngine } = await server.ssrLoadModule('/src/core/cube.ts');
  const { buildAdvancedLseTables } = await server.ssrLoadModule(
    '/src/methods/roux-advanced/lse/model.ts',
  );
  const { bytes, reachable, maximums } = buildAdvancedLseTables(await createCubeEngine());
  const manifest = {
      schema: 1,
      coordinateVersion: 1,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      reachable,
      maximums,
    },
    text = JSON.stringify(manifest, null, 2) + '\n';
  if (process.argv.includes('--verify')) {
    if (
      !Buffer.from(bytes).equals(await readFile(new URL('lse-advanced.bin', base))) ||
      text !== (await readFile(new URL('lse-advanced-manifest.json', base), 'utf8'))
    )
      throw Error('Advanced LSE assets differ from regeneration.');
  } else {
    await writeFile(new URL('lse-advanced.bin', base), bytes);
    await writeFile(new URL('lse-advanced-manifest.json', base), text);
  }
  console.log(JSON.stringify(manifest));
} finally {
  await server.close();
}
