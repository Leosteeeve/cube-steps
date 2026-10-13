import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type { CaseExample } from '../src/content/course-types.ts';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = (await server.ssrLoadModule(
    '/src/core/cube.ts',
  )) as typeof import('../src/core/cube.ts');
  const { solveAdvancedCFOP } = (await server.ssrLoadModule(
    '/src/methods/advanced/solve.ts',
  )) as typeof import('../src/methods/advanced/solve.ts');
  const { ALGORITHM_REGISTRY } = (await server.ssrLoadModule(
    '/src/algorithms/registry.ts',
  )) as typeof import('../src/algorithms/registry.ts');
  const { getCaseFixture } = (await server.ssrLoadModule(
    '/src/algorithms/fixtures.ts',
  )) as typeof import('../src/algorithms/fixtures.ts');
  const { seededScramble } = (await server.ssrLoadModule(
    '/tests/fixtures/lbl-cases.ts',
  )) as typeof import('../tests/fixtures/lbl-cases.ts');
  const engine = await createCubeEngine(),
    assets = {
      crossTable: {
        version: 1 as const,
        goalIndex: 69760,
        distances: new Uint8Array(
          await readFile(new URL('../src/methods/advanced/cross/distance-v1.bin', import.meta.url)),
        ),
      },
    };
  let guided = '';
  for (let seed = 1; seed <= 100; seed++) {
    const moves = seededScramble(seed),
      r = solveAdvancedCFOP(engine, engine.apply(engine.solved(), moves), assets);
    if (r.ok && r.trace.stages.slice(0, 4).every((s) => s.actions.length)) {
      guided = moves.join(' ');
      break;
    }
  }
  if (!guided) throw new Error('No complete guided example was verified.');
  const examples: CaseExample[] = [
    {
      id: 'shortest-cross',
      title: 'A minimum-turn bottom cross',
      scramble: guided,
      expectedCaseId: 'shortest-cross',
      stageId: 'advanced-cross',
    },
  ];
  for (const c of Object.values(ALGORITHM_REGISTRY.cases)) {
    const id = c.family === 'f2l' ? c.id + '/fr/u0' : c.id + '/u0',
      fixture = getCaseFixture(id);
    if (!fixture) throw new Error('Missing course fixture ' + id);
    examples.push({
      id: c.id,
      title: c.label,
      scramble: fixture.setup.join(' '),
      expectedCaseId: c.id,
      stageId:
        c.family === 'f2l' ? 'advanced-f2l' : c.family === 'oll' ? 'advanced-oll' : 'advanced-pll',
    });
  }
  examples.push({
    id: 'auf',
    title: 'Align the finished top layer',
    scramble: 'D',
    expectedCaseId: 'auf',
    stageId: 'advanced-auf',
  });
  const text =
    "import type {CaseExample} from './course-types';\n// Verified six-face setups; full fixture records stay outside normal lesson loading.\nexport const ADVANCED_GUIDED_SCRAMBLE=" +
    JSON.stringify(guided) +
    ';\nexport const ADVANCED_EXAMPLES:readonly CaseExample[]=' +
    JSON.stringify(examples, null, 2) +
    ';\n';
  await writeFile(new URL('../src/content/advanced-examples.ts', import.meta.url), text);
  console.log(
    'Wrote ' + examples.length + ' verified-case references and a complete guided scramble.',
  );
} finally {
  await server.close();
}
