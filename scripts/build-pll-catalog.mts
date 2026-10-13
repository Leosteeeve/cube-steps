import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type { TeachingMove, Face, Color } from '../src/core/types.ts';
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
  const { permutationFixture } = (await server.ssrLoadModule(
    '/tests/fixtures/advanced-last-layer.ts',
  )) as typeof import('../tests/fixtures/advanced-last-layer.ts');
  const { pllSignature } = (await server.ssrLoadModule(
    '/src/methods/advanced/recognize-pll.ts',
  )) as typeof import('../src/methods/advanced/recognize-pll.ts');
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
    await readFile(new URL('./data/pll-reference.json', import.meta.url), 'utf8'),
  ) as {
    id: string;
    sourceName: string;
    page: number;
    column: number;
    y: number;
    formula: string;
    sideStickers: Record<string, Partial<Record<Face, Color>>>;
  }[];
  const cases: Record<string, AlgorithmCase> = {},
    variants: Record<string, AlgorithmVariant> = {},
    recognition: Record<string, LastLayerMatch> = {};
  const placements: Omit<CaseFixture, 'setup' | 'holdingMoves'>[] = [];
  const alignments: TeachingMove[][] = [[], ['U'], ["U'"], ['U2']];
  for (const ref of references) {
    const initial = permutationFixture(engine, ref.sideStickers);
    if (!validateFacelets(stateToFacelets(engine.apply(initial, ['z2'])), engine.solved()).ok)
      throw new Error(ref.id + ': illegal independent permutation.');
    const formula = ref.formula.replace(/\[[^\]]*\]/g, '').replace(/2'/g, '2');
    const blocks = formula.match(/\([^)]*\)|[^()]+/g) ?? [];
    const moves: TeachingMove[] = [],
      segments: { label: string; start: number; end: number }[] = [];
    for (const block of blocks) {
      const tokens = block.match(/[UDLRFBMESxyzudlrfb](?:w)?(?:2|')?/g) ?? [];
      if (block.replace(/[UDLRFBMESxyzudlrfb](?:w)?(?:2|')?/g, '').replace(/[()\s]/g, ''))
        throw new Error(ref.id + ': invalid source notation.');
      if (!tokens.length) continue;
      const start = moves.length;
      moves.push(...normalizeTeachingAlgorithm(tokens.join(' ')));
      segments.push({ label: 'Move group ' + (segments.length + 1), start, end: moves.length });
    }
    const after = engine.apply(initial, moves);
    if (
      !firstTwoLayersSolved(engine, after) ||
      !alignments.some((u) => engine.isSolved(engine.apply(after, u)))
    )
      throw new Error(
        ref.id +
          ': one-look formula fails independent permutation ' +
          pllSignature(engine, initial),
      );
    const startSignature = pllSignature(engine, initial),
      canonicalSignature = alignments
        .map((u) => pllSignature(engine, engine.apply(initial, u)))
        .sort()[0];
    if (Object.values(cases).some((c) => c.canonicalSignature === canonicalSignature))
      throw new Error(ref.id + ': duplicate PLL class.');
    const sourceRefs = [
      {
        title: 'CubeSkills PLL',
        url: 'https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf',
        reference:
          ref.sourceName +
          ', page ' +
          ref.page +
          '. Side stickers independently read from the diagram; bracketed final U alignment is a separate stage.',
      },
    ];
    const variantId = ref.id + '/main',
      label = ref.sourceName + ' perm',
      group = ['ua', 'ub', 'h', 'z'].includes(ref.id.slice(4))
        ? 'Edges only'
        : ['aa', 'ab', 'e'].includes(ref.id.slice(4))
          ? 'Corners only'
          : 'Corners and edges';
    variants[variantId] = {
      id: variantId,
      caseId: ref.id,
      startSignature,
      executionPenalty: 0,
      sourceRefs,
      name: label,
      moves,
      precondition:
        'White down and yellow up. Match the side-color pattern after setup; relative corners and edges: ' +
        startSignature +
        '.',
      effect:
        'Put all last-layer pieces in their correct order. Keep yellow on top and restore the first two layers; a final U turn may still be needed.',
      segments,
    };
    const fixtureIds = Array.from({ length: 4 }, (_, u) => ref.id + '/u' + u);
    cases[ref.id] = {
      id: ref.id,
      family: 'pll',
      label,
      group,
      canonicalSignature,
      recognition:
        group +
        '. Compare matching side-color blocks, headlights and edge order around the yellow layer.',
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
      const signature = pllSignature(engine, engine.apply(initial, invertTeachingMoves(setup))),
        existing = recognition[signature];
      if (existing && existing.caseId !== ref.id) throw new Error('Ambiguous PLL key ' + signature);
      if (!existing || setup.length < existing.setup.length)
        recognition[signature] = { caseId: ref.id, variantId, setup };
    }
  }
  if (Object.keys(cases).length !== 21 || Object.keys(recognition).length !== 71)
    throw new Error('PLL coverage incomplete: ' + Object.keys(recognition).length);
  const catalog = { cases, variants, preparations: {} };
  admitRegistry(catalog);
  await writeFile(
    new URL('../src/algorithms/data/pll-catalog.json', import.meta.url),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  await writeFile(
    new URL('../src/algorithms/data/pll-recognition.json', import.meta.url),
    JSON.stringify(recognition, null, 2) + '\n',
  );
  await writeFile(
    new URL('./data/pll-placements.json', import.meta.url),
    JSON.stringify(placements, null, 2) + '\n',
  );
  console.log(
    'Admitted 21 PLL formulas and all 71 unsolved relative permutations from independent diagrams.',
  );
} finally {
  await server.close();
}
