import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type { CaseFixture } from '../src/algorithms/types.ts';
import type { FaceMove, TeachingMove } from '../src/core/types.ts';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = (await server.ssrLoadModule(
    '/src/core/cube.ts',
  )) as typeof import('../src/core/cube.ts');
  const { invertTeachingMoves } = (await server.ssrLoadModule(
    '/src/core/teaching-moves.ts',
  )) as typeof import('../src/core/teaching-moves.ts');
  const engine = await createCubeEngine();
  const output = new URL('../src/algorithms/data/case-fixtures.json', import.meta.url);
  const existing: Record<string, CaseFixture> = await readFile(output, 'utf8')
    .then(JSON.parse)
    .catch(() => ({}));
  if (process.argv.includes('--verify')) {
    const { verifyCaseFixture } = (await server.ssrLoadModule(
      '/src/algorithms/fixtures.ts',
    )) as typeof import('../src/algorithms/fixtures.ts');
    const { ALGORITHM_REGISTRY } = (await server.ssrLoadModule(
      '/src/algorithms/registry.ts',
    )) as typeof import('../src/algorithms/registry.ts');
    for (const c of Object.values(ALGORITHM_REGISTRY.cases))
      for (const id of c.fixtureIds) {
        if (!existing[id]) throw new Error(`Missing physical fixture ${id}`);
        verifyCaseFixture(engine, existing[id]);
      }
    console.log(
      `Verified ${Object.keys(existing).length} physical fixtures for ${Object.keys(ALGORITHM_REGISTRY.cases).length} cases.`,
    );
  } else {
    const { experimentalSolve3x3x3IgnoringCenters } = await import('cubing/search');
    const { puzzles } = await import('cubing/puzzles');
    const { KPattern } = await import('cubing/kpuzzle');
    const kpuzzle = await puzzles['3x3x3'].kpuzzle();
    const placements: Omit<CaseFixture, 'setup' | 'holdingMoves'>[] = [];
    for (const family of ['f2l', 'oll', 'pll']) {
      const text = await readFile(
        new URL(`./data/${family}-placements.json`, import.meta.url),
        'utf8',
      ).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return '[]';
        throw error;
      });
      placements.push(...JSON.parse(text));
    }
    let count = 0;
    for (const fixture of placements) {
      let setup = existing[fixture.id]?.setup;
      if (
        !setup ||
        !engine.equals(engine.apply(engine.solved(), [...setup, 'z2']), fixture.initial)
      ) {
        const fixed = engine.apply(fixture.initial, ['z2']);
        const solution = await experimentalSolve3x3x3IgnoringCenters(
          new KPattern(kpuzzle, fixed.data),
        );
        const tokens = solution.toString().trim().split(/\s+/) as TeachingMove[];
        if (!tokens.every((m) => /^[UDLRFB](?:2|')?$/.test(m)))
          throw new Error('Offline solver returned a non-face setup token.');
        setup = invertTeachingMoves(tokens) as FaceMove[];
      }
      if (!engine.equals(engine.apply(engine.solved(), [...setup, 'z2']), fixture.initial))
        throw new Error(`${fixture.id}: offline setup does not reproduce the independent state.`);
      const turns: FaceMove[][] = [[], ['U'], ['U2'], ["U'"]];
      for (let u = 0; u < 4; u++) {
        const id = fixture.id.replace(/u0$/, `u${u}`),
          initial = engine.apply(fixture.initial, turns[u]);
        const physical = [...setup, ...turns[u].map((m) => m.replace('U', 'D') as FaceMove)];
        if (!engine.equals(engine.apply(engine.solved(), [...physical, 'z2']), initial))
          throw new Error(`${id}: holding conversion failed.`);
        existing[id] = { ...fixture, id, setup: physical, holdingMoves: ['z2'], initial };
      }
      // Each base is durable, so an interrupted offline generation resumes safely.
      await writeFile(output, JSON.stringify(existing) + '\n');
      if (++count % 20 === 0) console.log(`Physical setups ${count}/${placements.length}`);
    }
    console.log(`Saved ${Object.keys(existing).length} independently verified physical setups.`);
    const { fixtureStateKey } = (await server.ssrLoadModule(
      '/src/algorithms/fixture-contract.ts',
    )) as typeof import('../src/algorithms/fixture-contract.ts');
    const identities = Object.fromEntries(
      Object.values(existing).map((f) => [
        f.id,
        {
          stateKey: fixtureStateKey(f.initial),
          ...(f.target ? { target: f.target } : {}),
          protectedIds: f.protectedIds,
        },
      ]),
    );
    await writeFile(
      new URL('../src/algorithms/data/fixture-index.json', import.meta.url),
      JSON.stringify(identities) + '\n',
    );
  }
} finally {
  await server.close();
}
