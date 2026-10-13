import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type { CubeEngine, CubeState, TeachingMove, Face } from '../src/core/types.ts';
import type {
  AlgorithmRegistry,
  AlgorithmCase,
  AlgorithmVariant,
  CaseFixture,
} from '../src/algorithms/types.ts';
import type { F2LTarget } from '../src/methods/advanced/f2l/types.ts';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = (await server.ssrLoadModule(
    '/src/core/cube.ts',
  )) as typeof import('../src/core/cube.ts');
  const { canonicalTargets, admissiblePairPlacements } = (await server.ssrLoadModule(
    '/tests/fixtures/advanced-f2l.ts',
  )) as typeof import('../tests/fixtures/advanced-f2l.ts');
  const { f2lSignature, canonicalF2LSignature } = (await server.ssrLoadModule(
    '/src/methods/advanced/f2l/recognize.ts',
  )) as typeof import('../src/methods/advanced/f2l/recognize.ts');
  const { observeF2LPairs, preservesF2L } = (await server.ssrLoadModule(
    '/src/methods/cfop/f2l-cases.ts',
  )) as typeof import('../src/methods/cfop/f2l-cases.ts');
  const { normalizeTeachingAlgorithm } = (await server.ssrLoadModule(
    '/src/core/teaching-moves.ts',
  )) as typeof import('../src/core/teaching-moves.ts');
  const { admitRegistry } = (await server.ssrLoadModule(
    '/src/algorithms/admission.ts',
  )) as typeof import('../src/algorithms/admission.ts');
  const engine: CubeEngine = await createCubeEngine(),
    targets = canonicalTargets(engine);
  const { EDGE_SLOTS } = (await server.ssrLoadModule(
    '/src/core/observations.ts',
  )) as typeof import('../src/core/observations.ts');
  const { stateToFacelets, validateFacelets } = (await server.ssrLoadModule(
    '/src/core/facelets.ts',
  )) as typeof import('../src/core/facelets.ts');
  const states = new Map(targets.map((t) => [t.slot, admissiblePairPlacements(engine, t)]));
  const front = targets.find((t) => t.slot === 'FR')!;
  const source = JSON.parse(
    await readFile(new URL('./data/f2l-reference.json', import.meta.url), 'utf8'),
  ) as { page: number; column: number; y: number; formula: string }[];
  if (source.length !== 41)
    throw new Error('Expected 41 independently transcribed source entries.');
  const cases: Record<string, AlgorithmCase> = {},
    variants: Record<string, AlgorithmVariant> = {},
    preparations: AlgorithmRegistry['preparations'] extends Readonly<infer T> ? T : never = {};
  const fixtures: Omit<CaseFixture, 'setup' | 'holdingMoves'>[] = [];
  const slotPower = { FR: 0, BR: 1, BL: 2, FL: 3 };
  function rotate(move: TeachingMove, power: number): TeachingMove {
    const sides = 'FRBL',
      index = sides.indexOf(move[0]);
    return index < 0 ? move : ((sides[(index + power + 4) % 4] + move.slice(1)) as TeachingMove);
  }
  function withoutRegrips(moves: readonly TeachingMove[]): TeachingMove[] {
    let power = 0;
    const result: TeachingMove[] = [];
    for (const move of moves) {
      const amount = move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1;
      if (move[0] === 'y') power = (power + amount) % 4;
      else if (move.startsWith('Dw')) {
        power = (power + 4 - amount) % 4;
        result.push(('U' + move.slice(2)) as TeachingMove);
      } else result.push(rotate(move, power));
    }
    return result;
  }
  for (const [index, ref] of source.entries()) {
    const id = `f2l-${String(index + 1).padStart(2, '0')}`;
    const text = ref.formula.replace(/2'/g, '2').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    const moves = normalizeTeachingAlgorithm(text);
    const matched = states.get('FR')!.filter((state) => {
      if (observeF2LPairs(engine, state).find((p) => p.cornerId === front.cornerId)!.solved)
        return false;
      const after = engine.apply(state, moves);
      return (
        observeF2LPairs(engine, after).find((p) => p.cornerId === front.cornerId)!.solved &&
        preservesF2L(engine, state, after)
      );
    });
    if (matched.length !== 1)
      throw new Error(`${id}: expected one independent placement, got ${matched.length}: ${text}`);
    const canonicalSignature = canonicalF2LSignature(engine, matched[0], front),
      rawSignature = f2lSignature(engine, matched[0], front).split('|')[1];
    if (Object.values(cases).some((c) => c.canonicalSignature === canonicalSignature))
      throw new Error(`${id}: duplicate source case.`);
    const [corner, white, edge, frontFace] = rawSignature.split(':');
    const group =
      corner === 'DRF'
        ? edge === 'FR'
          ? 'Both pieces in slot'
          : 'Corner in slot'
        : edge === 'FR'
          ? 'Edge in slot'
          : white === 'U'
            ? 'White on top'
            : 'White on the side';
    const sourceRefs = [
      {
        title: 'CubeSkills F2L',
        url: 'https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf',
        reference: `Page ${ref.page}, ${ref.column === 1 ? 'left' : 'right'} column, formula starting at PDF y=${ref.y}. CubeSteps numbering is its own reading order.`,
      },
    ];
    const variantIds: string[] = [],
      fixtureIds: string[] = [];
    for (const target of targets) {
      const slot = target.slot.toLowerCase(),
        startSignature = `${target.slot}|${rawSignature}`;
      const initial = states
        .get(target.slot)!
        .find((s) => f2lSignature(engine, s, target) === startSignature)!;
      if (!initial) throw new Error(`${id}/${slot}: missing independent legal placement.`);
      const observed = engine.observe(initial),
        observedCorner = observed.corners.find((p) => p.id === target.cornerId)!,
        observedEdge = observed.edges.find((p) => p.id === target.edgeId)!;
      const referenceFace = rotate('F', slotPower[target.slot]) as Face;
      const whiteFace = Object.entries(observedCorner.stickers).find(([, c]) => c === 'white')![0];
      const referenceStickerFace = Object.entries(observedEdge.stickers).find(
        ([, c]) => c === observed.centers[referenceFace],
      )![0];
      const options: [string, TeachingMove[], 0 | 1][] = [
        ['main', moves.map((m) => rotate(m, slotPower[target.slot])), 0],
      ];
      const noRotation = withoutRegrips(moves);
      if (noRotation.join(' ') !== moves.join(' '))
        options.push(['no-regrip', noRotation.map((m) => rotate(m, slotPower[target.slot])), 1]);
      for (const [name, oriented, executionPenalty] of options) {
        const variantId = `${id}/${name}/${slot}`,
          after = engine.apply(initial, oriented);
        if (
          !observeF2LPairs(engine, after).find((p) => p.cornerId === target.cornerId)!.solved ||
          !preservesF2L(engine, initial, after)
        )
          throw new Error(`${variantId} fails target or protection.`);
        variants[variantId] = {
          id: variantId,
          caseId: id,
          startSignature,
          targetSlot: target.slot,
          executionPenalty,
          sourceRefs,
          name: `F2L ${String(index + 1).padStart(2, '0')} · ${target.slot}${name === 'no-regrip' ? ' · no regrip' : ''}`,
          moves: oriented,
          precondition: `White down. Target slot ${target.slot}. Corner ${observedCorner.slot}, white facing ${whiteFace}; edge ${observedEdge.slot}, ${referenceFace}-center sticker facing ${referenceStickerFace}. Keep this grip when starting the formula.`,
          effect: `Complete the target pair and restore the cross and all previously completed pairs.${executionPenalty ? ' This alternative avoids the regrip but uses a less comfortable front/back face grip.' : ''}`,
          segments: [{ label: 'Pair and insert', start: 0, end: oriented.length }],
        };
        variantIds.push(variantId);
      }
      for (let u = 0; u < 4; u++) fixtureIds.push(`${id}/${slot}/u${u}`);
      fixtures.push({
        id: `${id}/${slot}/u0`,
        caseId: id,
        initial,
        target,
        protectedIds: observeF2LPairs(engine, initial)
          .filter((p) => p.solved)
          .map((p) => p.cornerId),
      });
    }
    cases[id] = {
      id,
      family: 'f2l',
      label: `F2L ${String(index + 1).padStart(2, '0')}`,
      group,
      canonicalSignature,
      recognition: `Find the white corner and the edge with the same two side colors. ${group}. Match the indicated sticker directions, then follow the displayed setup for your target slot.`,
      defaultVariantId: `${id}/main/fr`,
      variantIds,
      fixtureIds,
      sourceRefs,
    };
  }
  for (const target of targets)
    for (const direction of ['toward'] as const) {
      const moves = (['R', 'U', "R'"] as TeachingMove[]).map((m) =>
        rotate(m, slotPower[target.slot]),
      );
      preparations[`advanced-extract/${target.slot.toLowerCase()}/${direction}`] = {
        name: `Lift from ${target.slot}`,
        moves,
        precondition: `The ${target.slot} slot is unsolved and contains a trapped target piece.`,
        effect:
          'Lift the trapped piece to the upper layer and restore the cross and completed pairs.',
        segments: [{ label: 'Open, lift, restore', start: 0, end: 3 }],
      };
    }
  // A partial-pair example independent of the formula: exchange two non-target
  // middle edges and two yellow upper edges. Two swaps preserve legal parity.
  const base = fixtures.find((f) => f.id === 'f2l-01/fr/u0')!,
    mixed = structuredClone(base.initial);
  const observation = engine.observe(mixed),
    otherEdges = observeF2LPairs(engine, mixed)
      .filter((p) => p.solved)
      .slice(0, 2)
      .map((p) => observation.edges.find((e) => e.id === p.edgeId)!);
  const yellowEdges = observation.edges
    .filter((p) => p.slot.includes('U') && Object.values(p.stickers).includes('yellow'))
    .slice(0, 2);
  for (const pair of [otherEdges, yellowEdges]) {
    const [a, b] = pair.map((p) => EDGE_SLOTS.indexOf(p.slot));
    [mixed.data.EDGES.pieces[a], mixed.data.EDGES.pieces[b]] = [
      mixed.data.EDGES.pieces[b],
      mixed.data.EDGES.pieces[a],
    ];
  }
  if (
    !validateFacelets(stateToFacelets(engine.apply(mixed, ['z2'])), engine.solved()).ok ||
    canonicalF2LSignature(engine, mixed, base.target!) !== cases['f2l-01'].canonicalSignature
  )
    throw new Error('Invalid independent mixed F2L fixture.');
  const mixedAfter = engine.apply(mixed, variants['f2l-01/main/fr'].moves);
  if (
    !observeF2LPairs(engine, mixedAfter).find((p) => p.cornerId === base.target!.cornerId)
      ?.solved ||
    !preservesF2L(engine, mixed, mixedAfter)
  )
    throw new Error('Mixed F2L fixture does not preserve completed work.');
  cases['f2l-01'].fixtureIds = [
    ...cases['f2l-01'].fixtureIds,
    ...Array.from({ length: 4 }, (_, u) => 'f2l-01/fr/mixed/u' + u),
  ];
  fixtures.push({
    ...base,
    id: 'f2l-01/fr/mixed/u0',
    initial: mixed,
    protectedIds: observeF2LPairs(engine, mixed)
      .filter((p) => p.solved)
      .map((p) => p.cornerId),
  });
  const catalog = { cases, variants, preparations };
  admitRegistry(catalog);
  await writeFile(
    new URL('../src/algorithms/data/f2l-catalog.json', import.meta.url),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  await writeFile(
    new URL('./data/f2l-placements.json', import.meta.url),
    JSON.stringify(fixtures, null, 2) + '\n',
  );
  console.log(
    `Admitted ${Object.keys(cases).length} independently matched F2L cases, ${Object.keys(variants).length} oriented variants, ${fixtures.length} legal base fixtures.`,
  );
} finally {
  await server.close();
}
