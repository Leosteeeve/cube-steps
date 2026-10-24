import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import type { TeachingMove } from '../../src/core/types.ts';
import type { RouxWorkedExample } from '../../src/content/roux-advanced/examples.ts';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const load = (path: string) => server.ssrLoadModule(path),
    { createCubeEngine } = await load('/src/core/cube.ts'),
    { ROUX_FRAMES } = await load('/src/methods/roux-advanced/frames.ts'),
    { invertTeachingMoves } = await load('/src/core/teaching-moves.ts'),
    { verifyRouxWorkedExample } = await load('/src/content/roux-advanced/examples.ts'),
    { CMLL_CATALOG } = await load('/src/methods/roux-advanced/cmll/catalog.ts'),
    { createCmllDemonstration } = await load('/src/methods/roux-advanced/cmll/demonstration.ts'),
    { loadTestAdvancedRouxAssets } = await load('/tests/helpers/roux-advanced-assets.ts'),
    { planAdvancedLse } = await load('/src/methods/roux-advanced/lse/plan.ts'),
    { createRouxSearchBudget } = await load('/src/methods/roux-advanced/budget.ts');
  const e = await createCubeEngine(),
    rows: RouxWorkedExample[] = [],
    f = ROUX_FRAMES.find((f: any) => f.id === 'white-blue');
  function add(
    id: string,
    title: string,
    lessonIds: string[],
    caseId: string,
    setup: TeachingMove[],
    moves: TeachingMove[],
    stageId: RouxWorkedExample['stageId'],
    recognition: string,
    checks: string[],
    frame = f,
    extra: Partial<RouxWorkedExample> = {},
  ) {
    const row: RouxWorkedExample = {
      id,
      title,
      lessonIds,
      frameId: frame.id,
      expectedCaseId: caseId,
      scramble: '',
      setup,
      moves,
      stageId,
      recognition,
      physicalChecks: checks,
      stepNotes: moves.map(
        (m, i) =>
          `Turn ${m}. ${i === moves.length - 1 ? 'Check the completed target against both side colors.' : 'Track the joined pieces in the next displayed position; keep the printed physical hold.'}`,
      ),
      ...extra,
    };
    if (!verifyRouxWorkedExample(e, row))
      throw Error(`Example failed its independent claim: ${id}`);
    rows.push(row);
  }
  const held = [...f.positioningMoves] as TeachingMove[];
  add(
    'slice-forward',
    'M: move the middle, keep both sides',
    ['intro', 'ar-second-block'],
    'slice-M',
    [...held, "M'"],
    ['M'],
    'ar-second-block',
    'Both side blocks are complete. The middle slice is one M′ away from its reference.',
    ['Show the two unchanged blocks.', 'Check which center returns to the bottom.'],
  );
  add(
    'slice-back',
    'M′: the other direction is useful too',
    ['intro', 'ar-second-block'],
    'slice-M-prime',
    [...held, 'M'],
    ["M'"],
    'ar-second-block',
    'Both blocks are intact. The highlighted middle cycle needs the inverse direction.',
    [
      'M′ undoes this displacement in one turn.',
      'Do not add three M turns just because M is familiar.',
    ],
  );
  for (const [id, title, caseId, setup, recognition] of [
    [
      'square-pair',
      'A square and a ready pair',
      'square-pair',
      ['F'],
      'The back square stays solved; the matching front pair is joined off its slot.',
    ],
    [
      'joined-pair',
      'Use the pair that is already joined',
      'joined-pair',
      ['F'],
      'Read both shared colors on the front corner-edge pair before inserting it.',
    ],
    [
      'line',
      'Recognize a line inside a turned block',
      'line',
      ['L'],
      'The bottom row and the two side edges retain their relative connection. Restore the rigid group, instead of rebuilding its pieces.',
    ],
    [
      'late-base',
      'Two pairs first; the base edge later',
      'two-pairs-late-base',
      ['L2', 'M2', 'U', 'M', 'U2', "M'", 'U', 'M2', 'L2'],
      'Two corner-edge pairs are connected, but the base edge is displaced. This teaching sequence opens and restores the pairs around a middle-slice correction.',
    ],
  ] as const)
    add(
      id,
      title,
      ['ar-first-block', 'block-strategies'],
      caseId,
      [...held, ...setup],
      invertTeachingMoves(setup),
      'ar-first-block',
      recognition,
      [
        'Check all five left-block pieces, including the base edge.',
        'This is a recognition exercise, not a claim that the displayed maneuver is globally shortest.',
      ],
    );
  add(
    'right-block',
    'Finish the right block without losing the left',
    ['ar-second-block'],
    'second-block',
    [...held, 'R', 'U', "R'"],
    ['R', "U'", "R'"],
    'ar-second-block',
    'The left block is already complete. The right-side opening uses only R/U work.',
    ['Watch the entire left block remain unchanged.', 'Check both side blocks at the end.'],
  );
  add(
    'connected-blocks',
    'One extra first-block turn can help the next block',
    ['block-lookahead', 'practice-compare'],
    'lookahead',
    ['D2', "F'", "R'", 'D', ...held],
    ["U'", 'F', 'Rw'],
    'ar-first-block',
    'For this fixed input, a two-turn first block leaves a one-turn second-block continuation. The independent one-turn first-block reference does not determine the best combined route.',
    [
      'After U′ F, inspect the completed left block.',
      'After Rw, both blocks are complete. Compare the three-turn total in your hands.',
    ],
  );
  for (const group of CMLL_CATALOG.cases.filter((c: any) => c.id.endsWith('-1'))) {
    const variantId = group.variantIds[0],
      d = createCmllDemonstration(e, group.id, variantId, 'white-blue', 0);
    add(
      group.id,
      `${group.family}: ${group.label}`,
      ['ar-cmll'],
      `cmll:${group.id}`,
      [...d.source.prepared.setup],
      [...CMLL_CATALOG.variants[variantId].moves],
      'ar-cmll',
      d.recognition,
      [
        'Both blocks are restored.',
        'The corners are in cyclic order; the remaining edges still belong to LSE.',
      ],
      f,
      { formulaId: variantId },
    );
  }
  const assets = await loadTestAdvancedRouxAssets(),
    mix: TeachingMove[] = ['M', 'U2', "M'", 'U', 'M2', "U'", 'M', 'U'];
  for (const mode of ['combined', 'basic'] as const) {
    const start = e.apply(e.solved(), [...held, ...mix]),
      p = planAdvancedLse(
        e,
        start,
        f,
        assets.lse,
        assets.execution,
        createRouxSearchBudget('normal', { now: () => 0 }),
        mode,
      ),
      moves = p.actions.flatMap((a: any) => a.moves) as TeachingMove[];
    add(
      `lse-${mode}`,
      mode === 'combined'
        ? 'Connect EOLR to the final four edges'
        : 'Keep the basic EO → LR checkpoints',
      ['ar-eolr'],
      mode === 'combined' ? 'eolr-combined' : 'lse-basic',
      [...held, ...mix],
      moves,
      'ar-eolr',
      'Both blocks and the corner ring are complete. Compare the same six-edge state in the two explanations.',
      [
        'At the marked boundary, edges are oriented and the lateral edges are placed relative to the corner ring.',
        'At the final endpoint, centers and the corner U offset are restored too.',
      ],
      f,
      {
        eolrBoundary: p.eolrBoundary,
        stepNotes: p.actions.flatMap((a: any) => a.moves.map(() => a.explanation)),
      },
    );
  }
  for (const frame of ROUX_FRAMES)
    add(
      `hold-${frame.id}`,
      `${frame.bottom} bottom, ${frame.left} left`,
      ['starting-block'],
      'holding',
      [...frame.positioningMoves, 'M'],
      ["M'"],
      'ar-position',
      `Keep ${frame.bottom} as your block-bottom color, ${frame.left} left and ${frame.centers.F} front. The middle centers can move.`,
      [
        'Identify both side centers and the bottom color of the block pieces.',
        'The formula letters refer to the chosen physical hold, not to a camera orbit.',
      ],
      frame,
    );
  const text = JSON.stringify(rows, null, 2) + '\n',
    path = 'src/content/roux-advanced/example-fixtures.json';
  if (process.argv.includes('--verify')) {
    if (JSON.stringify(JSON.parse(await readFile(path, 'utf8'))) !== JSON.stringify(rows))
      throw Error('Advanced Roux examples are stale.');
  } else await writeFile(path, text);
  console.log(
    `Verified ${rows.length} legal worked examples, eight frames, CMLL families and both LSE explanations.`,
  );
} finally {
  await server.close();
}
