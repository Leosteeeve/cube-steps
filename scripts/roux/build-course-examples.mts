import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type {
  CubeState,
  SolveInput,
  TeachingMove,
  TraceStage,
  RouxStageId,
} from '../../src/core/types.ts';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const load = (path: string) => server.ssrLoadModule(path);
  const { createCubeEngine } = await load('/src/core/cube.ts');
  const { rouxReferenceState, observeRouxFrame } = await load('/src/methods/roux/frame.ts');
  const { stateToFacelets, validateFacelets } = await load('/src/core/facelets.ts');
  const { solveRoux } = await load('/src/methods/roux/solve.ts');
  const { loadTestRouxAssets } = await load('/tests/helpers/roux.ts');
  const { seededScramble } = await load('/tests/fixtures/lbl-cases.ts');
  const { ROUX_CORNER_ALGORITHMS } = await load('/src/methods/roux/corners/catalog.ts');
  const { invertTeachingMoves } = await load('/src/core/teaching-moves.ts');
  const { observeLseEO } = await load('/src/methods/roux/lse/orientation.ts');
  const { rouxFixture } = await load('/tests/fixtures/roux-cases.ts');
  const e = await createCubeEngine(),
    assets = await loadTestRouxAssets(),
    ref = rouxReferenceState(e);
  const rows: any[] = [];
  function add(
    id: string,
    stage: RouxStageId,
    caption: string,
    state: CubeState,
    required: string[] = [],
    claim?: (s: TraceStage) => boolean,
  ) {
    if (observeRouxFrame(e, state).centerPhase !== 0)
      throw Error(id + ' must have canonicalizable centers');
    const canonical = e.apply(state, ["y'", 'x2']);
    const input: SolveInput = { kind: 'facelets', facelets: stateToFacelets(canonical) };
    if (!validateFacelets(input.facelets, e.solved()).ok) throw Error(id + ' illegal input');
    const r = solveRoux(e, canonical, assets);
    if (!r.ok) throw Error(id + ': ' + r.message);
    const s = r.trace.stages.find((s: TraceStage) => s.id === stage)!;
    const ids = [
      ...new Set<string>(
        s.actions.flatMap((a: any) => a.joined?.sources ?? [a]).map((a: any) => a.ruleId),
      ),
    ];
    for (const rule of required)
      if (!ids.includes(rule)) throw Error(id + ' did not reach ' + rule);
    if (claim && !claim(s)) throw Error(id + ' did not demonstrate its claim');
    if (id.endsWith('-skip') && s.status !== 'skipped') throw Error(id + ' did not skip');
    rows.push({
      id,
      lessonId: stage === 'roux-frame' ? 'intro' : stage,
      input,
      expectedStage: stage,
      expectedRuleIds: ids,
      caption,
    });
  }
  const moves = (text: string) => e.apply(ref, text ? (text.split(' ') as TeachingMove[]) : []);
  add(
    'hold',
    'roux-frame',
    'Start in the input hold, then follow the visible x2 y regrip. Camera orbit is only for looking.',
    ref,
  );
  for (const [id, caption, text] of [
    [
      'left-base-displaced',
      'The white-blue base edge is displaced. Read both colors before moving it.',
      'L',
    ],
    ['left-front-pair', 'Rebuild the front left pair while preserving the rear pair.', "L' U L"],
    [
      'left-rear-pair',
      'Inspect the rear left pair with the camera; the physical hold stays fixed.',
      "L U L'",
    ],
    [
      'left-separated-trapped',
      'Separate the jobs: locate a trapped target, extract it, then join and insert the correct pair.',
      'F U2 B L2 D',
    ],
  ])
    add(id, 'roux-first-block', caption, moves(text));
  const flipped = structuredClone(ref);
  flipped.data.EDGES.orientation[7] ^= 1;
  flipped.data.EDGES.orientation[0] ^= 1;
  add(
    'left-base-flipped',
    'roux-first-block',
    'The white-blue edge is in its slot but flipped. A correct location is not yet a correct piece.',
    flipped,
  );
  add(
    'left-skip',
    'roux-first-block',
    'A complete left block needs no turns. The base and both pairs already match.',
    ref,
  );
  for (const [id, caption, text] of [
    [
      'right-base-displaced',
      'Place the white-green base edge while the left block stays intact.',
      'R2',
    ],
    [
      'right-front-pair',
      'Join and insert the front right pair with the left block protected.',
      "R U R'",
    ],
    [
      'right-rear-pair',
      'Choose the rear right pair because it is ready; inspect behind without turning the whole cube.',
      "R' U R",
    ],
    [
      'right-extraction',
      'Extract and rebuild the right pair through its working area.',
      "R U2 R' U R2 U2",
    ],
  ])
    add(id, 'roux-second-block', caption, moves(text));
  for (const [id, alg] of Object.entries(ROUX_CORNER_ALGORITHMS) as [
    string,
    { moves: TeachingMove[] },
  ][]) {
    const state = e.apply(ref, invertTeachingMoves(alg.moves));
    // An even pair of edge flips makes the absent yellow-cross prerequisite visible.
    const withEdges = structuredClone(state);
    withEdges.data.EDGES.orientation[0] ^= 1;
    withEdges.data.EDGES.orientation[1] ^= 1;
    add(
      id,
      id.includes('ocll') ? 'roux-corner-orientation' : 'roux-corner-permutation',
      id.includes('ocll')
        ? 'Match the yellow corner stickers only. The top edges are deliberately not a yellow cross.'
        : id === 'roux-t'
          ? 'Match the two corner headlights and hold them on the left for T-perm.'
          : 'No matching corner headlights: use the verified Y-perm hold.',
      withEdges,
      [id],
    );
  }
  add(
    'orientation-skip',
    'roux-corner-orientation',
    'All yellow corner stickers already face up; leave the edges for later.',
    ref,
  );
  add(
    'permutation-skip',
    'roux-corner-permutation',
    'The corner ring already matches the blocks; no permutation formula is needed.',
    ref,
  );
  add(
    'corner-alignment',
    'roux-corner-permutation',
    'The corners have the right cyclic order. Align U with the block frame.',
    moves('U'),
    ['roux-corner-align'],
  );
  add(
    'corner-setup',
    'roux-corner-orientation',
    'A separate U setup puts the pattern in its execution hold; then apply the whole formula.',
    e.apply(e.apply(ref, invertTeachingMoves(ROUX_CORNER_ALGORITHMS['roux-ocll-27'].moves)), ['U']),
    ['roux-corner-setup', 'roux-ocll-27'],
  );
  for (const count of [0, 2, 4, 6]) {
    const state = structuredClone(ref);
    for (const index of [0, 1, 2, 3, 4, 6].slice(0, count))
      state.data.EDGES.orientation[index] ^= 1;
    add(
      'eo-' + count + (count === 0 ? '-skip' : ''),
      'roux-edge-orientation',
      `${count} edges need orientation under the yellow-up reference. Position and orientation are different questions.`,
      state,
      [],
      (s) => observeLseEO(e, s.before).badIds?.length === count,
    );
  }
  for (const side of ['front', 'back'])
    add(
      'eo-' + side + '-arrow',
      'roux-edge-orientation',
      `Watch the ${side} arrow preparation, the middle slice direction and the restored reference.`,
      rouxFixture(e, 'lse-' + side + '-arrow'),
      [],
      (s) => s.actions.some((a) => a.caseId.includes('prepared-arrow')),
    );
  add(
    'lr-skip',
    'roux-left-right-edges',
    'Both target edges already match the corner ring; continue to the last four.',
    ref,
  );
  add(
    'finish-residual',
    'roux-last-four-edges',
    'Finish a remaining middle-edge cycle and restore the final centers and U alignment.',
    moves('M2 U2 M2 U2'),
  );
  add(
    'finish-skip',
    'roux-last-four-edges',
    'All faces already match. Check every face before putting the cube down.',
    ref,
  );
  const { cornerOffset, sameRouxPiece } = await load('/src/methods/roux/predicates.ts');
  const lrIds = e
    .observe(ref)
    .edges.filter(
      (p: any) =>
        Object.values(p.stickers).includes('yellow') &&
        (Object.values(p.stickers).includes('blue') || Object.values(p.stickers).includes('green')),
    )
    .map((p: any) => p.id);
  const lseWanted = ['lr-bottom-targets', 'lr-one-complete', 'lr-top-targets', 'finish-centers'];
  for (let seed = 1; lseWanted.length && seed <= 300; seed++) {
    let random = seed,
      state = ref;
    for (let n = 0; n < 14; n++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      state = e.apply(state, [['M', 'M2', "M'", 'U', 'U2', "U'"][random % 6]]);
    }
    const phase = observeRouxFrame(e, state).centerPhase;
    if (phase) state = e.apply(state, [phase === 1 ? "M'" : phase === 2 ? 'M2' : 'M']);
    const r = solveRoux(e, e.apply(state, ["y'", 'x2']), assets);
    if (!r.ok) throw Error(r.message);
    const lr = r.trace.stages.find((s: TraceStage) => s.id === 'roux-left-right-edges')!;
    const targets = e.observe(lr.before).edges.filter((p: any) => lrIds.includes(p.id));
    const relative = e.observe(
      e.apply(ref, Array(cornerOffset(e, lr.before) ?? 0).fill('U')),
    ).edges;
    const matched = targets.filter((p: any) =>
      sameRouxPiece(
        p,
        relative.find((q: any) => q.id === p.id),
      ),
    ).length;
    for (let i = lseWanted.length - 1; i >= 0; i--) {
      const id = lseWanted[i],
        fin = r.trace.stages.at(-1)!;
      const good =
        id === 'lr-bottom-targets'
          ? targets.some((p: any) => p.slot === 'DF' || p.slot === 'DB') && lr.actions.length > 0
          : id === 'lr-one-complete'
            ? matched === 1
            : id === 'lr-top-targets'
              ? targets.every((p: any) => p.slot.includes('U')) && matched < 2
              : observeRouxFrame(e, fin.before).centerPhase === 2 && fin.actions.length > 0;
      if (!good) continue;
      const caption =
        id === 'lr-bottom-targets'
          ? 'A yellow-side target starts in the bottom middle slice. Follow the full transport, not a pretend two-edge swap.'
          : id === 'lr-one-complete'
            ? 'One target already matches its neighboring corners. Place the other and restore that relationship.'
            : id === 'lr-top-targets'
              ? 'Both targets are on top but are not both matched to their corner neighbors. Upper location alone is not enough.'
              : 'The side blocks and left/right targets are complete, but the middle centers need a half turn. Follow the final alignment and check all six faces.';
      add(
        id,
        id === 'finish-centers' ? 'roux-last-four-edges' : 'roux-left-right-edges',
        caption,
        state,
      );
      lseWanted.splice(i, 1);
    }
  }
  if (lseWanted.length) throw Error('Missing placement examples: ' + lseWanted);
  const wanted = [
    ['left-m', 'roux-first-block', 'M'],
    ['left-m-prime', 'roux-first-block', "M'"],
    ['right-m', 'roux-second-block', 'M'],
    ['right-m-prime', 'roux-second-block', "M'"],
    ['eo-reference', 'roux-edge-orientation', 'reference'],
  ];
  for (let seed = 1; wanted.length && seed <= 200; seed++) {
    const initial = e.apply(e.solved(), seededScramble(seed)),
      result = solveRoux(e, initial, assets);
    if (!result.ok) throw Error(result.message);
    for (let i = wanted.length - 1; i >= 0; i--) {
      const [id, stage, token] = wanted[i],
        s = result.trace.stages.find((s: TraceStage) => s.id === stage)!;
      if (
        !s.actions.some((a: any) =>
          token === 'reference'
            ? (a.joined?.sources ?? [a]).some((source: any) => source.caseId.includes('reference'))
            : a.moves.length === 1 && a.moves[0] === token,
        )
      )
        continue;
      const held = e.apply(initial, ['x2', 'y']);
      add(
        id,
        stage as RouxStageId,
        token === 'reference'
          ? 'The preceding work leaves a red or orange top center. A reference setup may join the arrow into one connected sequence. Follow the displayed moves once and judge edge orientation only at its checkpoint; the separate reference actions are not extra moves.'
          : `A useful ${token} moves a real block target. Read the recognition and protected pieces; this is not an extra decorative turn.`,
        held,
        [],
        (s) =>
          s.actions.some((a) =>
            token === 'reference'
              ? (a.joined?.sources ?? [a]).some((source) => source.caseId.includes('reference'))
              : a.moves.length === 1 && a.moves[0] === token,
          ),
      );
      wanted.splice(i, 1);
    }
  }
  if (wanted.length) throw Error('Missing slice examples: ' + JSON.stringify(wanted));
  const file = new URL('../../src/content/roux/example-fixtures.json', import.meta.url);
  if (process.argv.includes('--verify')) {
    if (JSON.stringify(JSON.parse(await readFile(file, 'utf8'))) !== JSON.stringify(rows))
      throw Error('Roux course fixtures are stale');
  } else await writeFile(file, JSON.stringify(rows, null, 2) + '\n');
  console.log(
    `Verified ${rows.length} legal canonical inputs, complete solves and teaching claims.`,
  );
} finally {
  await server.close();
}
