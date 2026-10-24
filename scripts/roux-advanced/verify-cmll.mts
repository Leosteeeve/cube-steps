import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = await server.ssrLoadModule('/src/core/cube.ts');
  const { buildCmllCatalog } = await server.ssrLoadModule(
    '/src/methods/roux-advanced/cmll/catalog.ts',
  );
  const { admitCmllCatalog } = await server.ssrLoadModule(
    '/src/methods/roux-advanced/cmll/admission.ts',
  );
  const { createRouxSearchBudget } = await server.ssrLoadModule(
    '/src/methods/roux-advanced/budget.ts',
  );
  const e = await createCubeEngine(),
    catalog = buildCmllCatalog(e);
  admitCmllCatalog(e, catalog, createRouxSearchBudget('lab', { now: () => 0 }));
  const text = JSON.stringify(catalog, null, 2) + '\n',
    path = new URL('../../src/methods/roux-advanced/data/cmll-catalog.json', import.meta.url);
  if (process.argv.includes('--write')) await writeFile(path, text);
  else if ((await readFile(path, 'utf8')) !== text)
    throw Error('Generated CMLL catalog differs from verified source data.');
  console.log(
    JSON.stringify({
      cases: catalog.cases.length,
      variants: Object.keys(catalog.variants).length,
      digest: catalog.digest,
      bytes: Buffer.byteLength(text),
      sha256: createHash('sha256').update(text).digest('hex'),
    }),
  );
} finally {
  await server.close();
}
