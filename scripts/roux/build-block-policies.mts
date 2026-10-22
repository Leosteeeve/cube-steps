import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = await server.ssrLoadModule('/src/core/cube.ts') as typeof import('../../src/core/cube.ts');
  const { generateBlockPolicies, validateBlockPolicies } = await server.ssrLoadModule(
    '/src/methods/roux/blocks/policies.ts',
  ) as typeof import('../../src/methods/roux/blocks/policies.ts');
  const engine = await createCubeEngine();
  const policies = generateBlockPolicies(engine);
  validateBlockPolicies(policies);
  const bytes = JSON.stringify(policies) + '\n';
  const directory = new URL('../../src/methods/roux/data/', import.meta.url);
  const target = new URL('block-policies.json', directory);
  if (process.argv.includes('--verify')) {
    if ((await readFile(target, 'utf8')) !== bytes)
      throw new Error('Roux block policies are stale. Regenerate and review the catalog change.');
  } else {
    await mkdir(directory, { recursive: true });
    await writeFile(target, bytes);
  }
  console.log(
    JSON.stringify({
      tables: policies.tables.length,
      states: policies.tables.reduce((n, t) => n + t.covered, 0),
      bytes: Buffer.byteLength(bytes),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }),
  );
} finally {
  await server.close();
}
