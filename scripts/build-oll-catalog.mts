import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type { TeachingMove } from '../src/core/types.ts';
import type {
  AlgorithmCase,
  AlgorithmVariant,
  CaseFixture,
  LastLayerMatch,
} from '../src/algorithms/types.ts';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = (await server.ssrLoadModule(
    '/src/core/cube.ts',
  )) as typeof import('../src/core/cube.ts');
  const { orientationFixture } = (await server.ssrLoadModule(
    '/tests/fixtures/advanced-last-layer.ts',
  )) as typeof import('../tests/fixtures/advanced-last-layer.ts');
  const { ollSignature } = (await server.ssrLoadModule(
    '/src/methods/advanced/recognize-oll.ts',
  )) as typeof import('../src/methods/advanced/recognize-oll.ts');
  const { firstTwoLayersSolved } = (await server.ssrLoadModule(
    '/src/methods/shared/pieces.ts',
  )) as typeof import('../src/methods/shared/pieces.ts');
  const { normalizeTeachingAlgorithm, invertTeachingMoves } = (await server.ssrLoadModule(
    '/src/core/teaching-moves.ts',
  )) as typeof import('../src/core/teaching-moves.ts');
  const { stateToFacelets, validateFacelets } = (await server.ssrLoadModule(
    '/src/core/facelets.ts',
  )) as typeof import('../src/core/facelets.ts');
  const { admitRegistry } = (await server.ssrLoadModule(
    '/src/algorithms/admission.ts',
  )) as typeof import('../src/algorithms/admission.ts');
  const engine = await createCubeEngine();
  const references = JSON.parse(
    await readFile(new URL('./data/oll-reference.json', import.meta.url), 'utf8'),
  ) as {
    id: string;
    sourceName: string;
    page: number;
    column: number;
    y: number;
    formula: string;
    yellowFaces: string[];
  }[];
  const cases: Record<string, AlgorithmCase> = {},
    variants: Record<string, AlgorithmVariant> = {},
    recognition: Record<string, LastLayerMatch> = {};
  const placements: Omit<CaseFixture, 'setup' | 'holdingMoves'>[] = [];
  const alignments: TeachingMove[][] = [[], ['U'], ["U'"], ['U2']];
  const groups: Record<string, string> = {
    OCLL: 'All edges oriented',
    T: 'T shapes',
    S: 'Squares',
    C: 'C shapes',
    W: 'W shapes',
    E: 'Corners oriented',
    P: 'P shapes',
    I: 'Lines',
    F: 'Fish shapes',
    K: 'Knight moves',
    A: 'Awkward shapes',
    L: 'L shapes',
    B: 'Lightning bolts',
    O: 'No edges oriented',
  };
  for (const ref of references) {
    const initial = orientationFixture(engine, ref.yellowFaces);
    if (!validateFacelets(stateToFacelets(engine.apply(initial, ['z2'])), engine.solved()).ok)
      throw new Error(`${ref.id}: illegal independent reference pattern.`);
    const blocks = ref.formula.replace(/2'/g, '2').match(/\([^)]*\)|[^()]+/g) ?? [];
    let moves: TeachingMove[] = [];
    let segments: { label: string; start: number; end: number }[] = [];
    for (const block of blocks) {
      const tokens = block.match(/[UDLRFBMESxyzudlrfb](?:w)?(?:2|')?/g) ?? [];
      if (block.replace(/[UDLRFBMESxyzudlrfb](?:w)?(?:2|')?/g, '').replace(/[()\s]/g, ''))
        throw new Error(`${ref.id}: invalid source notation.`);
      if (!tokens.length) continue;
      const start = moves.length;
      moves.push(...normalizeTeachingAlgorithm(tokens.join(' ')));
      segments.push({ label: `Move group ${segments.length + 1}`, start, end: moves.length });
    }
    const leading: TeachingMove[] = [];
    while (moves[0]?.startsWith('y')) leading.push(moves.shift()!);
    segments = segments
      .filter((s) => s.end > leading.length)
      .map((s) => ({
        ...s,
        start: Math.max(0, s.start - leading.length),
        end: s.end - leading.length,
      }));
    const held = engine.apply(initial, leading),
      startSignature = ollSignature(engine, held),
      after = engine.apply(held, moves);
    if (!firstTwoLayersSolved(engine, after) || ollSignature(engine, after) !== 'UUUUUUUU')
      throw new Error(
        `${ref.id}: referenced one-look formula fails independent pattern ${ref.yellowFaces.join('')}.`,
      );
    const canonicalSignature = alignments
      .map((u) => ollSignature(engine, engine.apply(initial, u)))
      .sort()[0];
    if (Object.values(cases).some((c) => c.canonicalSignature === canonicalSignature))
      throw new Error(`${ref.id}: ambiguous OLL pattern.`);
    const sourceRefs = [
      {
        title: 'CubeSkills OLL',
        url: 'https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf',
        reference: `${ref.sourceName}, OLL ${Number(ref.id.slice(4))}, page ${ref.page}. Sticker directions independently read from the reference diagram; source leading y rotations become explicit setup.`,
      },
    ];
    const variantId = `${ref.id}/main`,
      label = `OLL ${Number(ref.id.slice(4))}`,
      group = groups[ref.sourceName.replace(/\d/g, '')];
    variants[variantId] = {
      id: variantId,
      caseId: ref.id,
      startSignature,
      executionPenalty: 0,
      sourceRefs,
      name: label,
      moves,
      precondition: `White down. After setup, yellow directions for UF, UR, UB, UL, UFR, URB, UBL, ULF are ${startSignature.split('').join(', ')}.`,
      effect:
        'Turn every last-layer sticker yellow on top, then check that the first two layers are restored. Side colors can still need PLL.',
      segments,
    };
    const fixtureIds = Array.from({ length: 4 }, (_, u) => `${ref.id}/u${u}`);
    cases[ref.id] = {
      id: ref.id,
      family: 'oll',
      label,
      group,
      canonicalSignature,
      recognition: `${group}. Compare the side-facing yellow stickers as well as the top. Ignore piece permutation.`,
      defaultVariantId: variantId,
      variantIds: [variantId],
      fixtureIds,
      sourceRefs,
    };
    placements.push({
      id: fixtureIds[0],
      caseId: ref.id,
      initial,
      protectedIds: ['UFR', 'URB', 'UBL', 'ULF'],
    });
    for (const setup of alignments) {
      const source = engine.apply(held, invertTeachingMoves(setup)),
        signature = ollSignature(engine, source);
      const existing = recognition[signature];
      if (existing?.caseId && existing.caseId !== ref.id)
        throw new Error(`Ambiguous recognition key ${signature}.`);
      if (!existing || setup.length < existing.setup.length)
        recognition[signature] = { caseId: ref.id, variantId, setup };
    }
  }
  if (Object.keys(cases).length !== 57 || Object.keys(recognition).length !== 215)
    throw new Error('OLL catalog does not cover every unsolved legal orientation.');
  const catalog = { cases, variants, preparations: {} };
  admitRegistry(catalog);
  await writeFile(
    new URL('../src/algorithms/data/oll-catalog.json', import.meta.url),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  await writeFile(
    new URL('../src/algorithms/data/oll-recognition.json', import.meta.url),
    JSON.stringify(recognition, null, 2) + '\n',
  );
  await writeFile(
    new URL('./data/oll-placements.json', import.meta.url),
    JSON.stringify(placements, null, 2) + '\n',
  );
  console.log(
    'Admitted 57 OLL formulas and all 215 unsolved orientation signatures from independent diagrams.',
  );
} finally {
  await server.close();
}
