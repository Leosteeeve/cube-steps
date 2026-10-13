import type {
  CubeEngine,
  CubeState,
  FaceMove,
  TeachingMove,
  TraceAction,
  Checkpoint,
} from '../core/types';
import type { CaseFixture, CaseId, VariantId } from './types';
import { ALGORITHM_REGISTRY } from './registry';
import { verifyCaseFixture, FIXTURE_IDENTITIES } from './case-validation';
import { f2lSignature, U_ALIGNMENTS } from '../methods/advanced/f2l/recognize';
import { observeF2LPairs, preservesF2L } from '../methods/cfop/f2l-cases';
import { ollSignature } from '../methods/advanced/recognize-oll';
import { pllSignature } from '../methods/advanced/recognize-pll';
import { checkAdvancedStage } from '../methods/advanced/stages';
import { advancedLastLayerTargets } from '../methods/advanced/last-layer';
import { describeCaseRecognition } from './recognition-evidence';
export interface AlgorithmDemonstration {
  caseId: CaseId;
  variantId: VariantId;
  fixtureId: string;
  setup: readonly FaceMove[];
  holdingMoves: readonly TeachingMove[];
  initial: CubeState;
  actions: TraceAction[];
  final: CubeState;
  checkpoint: Checkpoint;
}
export function createDemonstration(
  engine: CubeEngine,
  fixture: CaseFixture,
  variantId: VariantId,
): AlgorithmDemonstration {
  verifyCaseFixture(engine, fixture);
  const c = ALGORITHM_REGISTRY.cases[fixture.caseId],
    variant = ALGORITHM_REGISTRY.variants[variantId];
  if (!variant || variant.caseId !== c.id || !c.variantIds.includes(variantId))
    throw new Error('The variant does not belong to this case.');
  const goal = (s: CubeState) =>
    c.family === 'f2l'
      ? preservesF2L(engine, fixture.initial, s) &&
        !!observeF2LPairs(engine, s).find((p) => p.cornerId === fixture.target?.cornerId)?.solved
      : checkAdvancedStage(engine, s, c.family === 'oll' ? 'advanced-oll' : 'advanced-pll');
  let setup: { y: TeachingMove[]; u: TeachingMove[] } | undefined;
  for (const y of [[], ['y'], ["y'"], ['y2']] as TeachingMove[][]) {
    for (const u of U_ALIGNMENTS) {
      const held = engine.apply(fixture.initial, [...y, ...u]);
      const signature =
        c.family === 'f2l'
          ? f2lSignature(engine, held, fixture.target!)
          : c.family === 'oll'
            ? ollSignature(engine, held)
            : pllSignature(engine, held);
      if (signature === variant.startSignature && goal(engine.apply(held, variant.moves))) {
        setup = { y, u: [...u] };
        break;
      }
    }
    if (setup) break;
  }
  if (!setup)
    throw new Error('No verified holding frame makes this variant applicable to the fixture.');
  const actions: TraceAction[] = [];
  let state = fixture.initial;
  const targets = () =>
    c.family === 'f2l'
      ? [fixture.target!.cornerId, fixture.target!.edgeId]
      : advancedLastLayerTargets(engine, state);
  const append = (
    input: Omit<TraceAction, 'before' | 'after' | 'checkpoint'>,
    description: string,
    test: (s: CubeState) => boolean,
  ) => {
    const before = state,
      after = engine.apply(state, input.moves),
      passed = test(after);
    if (!passed) throw new Error('Demonstration checkpoint failed: ' + description);
    actions.push({
      ...input,
      before,
      after,
      checkpoint: { id: input.ruleId, description, passed },
    });
    state = after;
  };
  if (setup.y.length)
    append(
      {
        kind: 'regrip',
        ruleId: 'demonstration-holding',
        caseId: c.id,
        targets: targets(),
        moves: setup.y,
        recognition: describeCaseRecognition(engine, state, c, targets()),
        explanation: `Rotate the whole cube to put ${engine.observe(engine.apply(state, setup.y)).centers.F} in front, keeping white down. Continue from this hold after the formula. This is a physical regrip; dragging the view does not perform it.`,
      },
      'White stays down; the completed pairs and cross are preserved.',
      (s) => preservesF2L(engine, fixture.initial, s),
    );
  if (setup.u.length)
    append(
      {
        kind: 'setup',
        ruleId: 'demonstration-align',
        caseId: c.id,
        targets: targets(),
        moves: setup.u,
        recognition: describeCaseRecognition(engine, state, c, targets()),
        explanation:
          'Turn the upper layer until the shown stickers match the formula starting pattern.',
      },
      'The target pattern is aligned and earlier completed work is preserved.',
      (s) => preservesF2L(engine, fixture.initial, s),
    );
  const description =
    c.family === 'f2l'
      ? 'F2L complete for the selected pair; the cross and earlier completed pairs are restored.'
      : c.family === 'oll'
        ? 'OLL complete: yellow faces up and the first two layers are restored. The sides can still need PLL.'
        : 'PLL complete: all last-layer pieces are in order and the first two layers are restored. A final U alignment may still be needed.';
  append(
    {
      kind: 'algorithm',
      ruleId: 'demonstration-formula',
      caseId: c.id,
      algorithmId: variant.id,
      targets: targets(),
      moves: [...variant.moves],
      recognition: variant.precondition,
      explanation: variant.effect,
    },
    description,
    goal,
  );
  return {
    caseId: c.id,
    variantId,
    fixtureId: fixture.id,
    setup: [...fixture.setup],
    holdingMoves: [...fixture.holdingMoves],
    initial: fixture.initial,
    actions,
    final: state,
    checkpoint: { id: c.family, description, passed: goal(state) },
  };
}
export function verifyDemonstration(engine: CubeEngine, demo: AlgorithmDemonstration): void {
  const identity = FIXTURE_IDENTITIES[demo.fixtureId];
  if (!identity) throw new Error('Unknown demonstration fixture.');
  const expected = createDemonstration(
    engine,
    {
      id: demo.fixtureId,
      caseId: demo.caseId,
      setup: demo.setup,
      holdingMoves: demo.holdingMoves,
      initial: demo.initial,
      target: identity.target,
      protectedIds: identity.protectedIds,
    },
    demo.variantId,
  );
  if (
    !engine.equals(demo.final, expected.final) ||
    JSON.stringify(demo.checkpoint) !== JSON.stringify(expected.checkpoint) ||
    demo.actions.length !== expected.actions.length
  )
    throw new Error('Demonstration endpoint or checkpoint was altered.');
  for (let i = 0; i < expected.actions.length; i++) {
    const a = demo.actions[i],
      e = expected.actions[i];
    if (!engine.equals(a.before, e.before) || !engine.equals(a.after, e.after))
      throw new Error('Demonstration action state was altered.');
    const { before: _b, after: _a, ...metadata } = a,
      { before: _eb, after: _ea, ...expectedMetadata } = e;
    if (JSON.stringify(metadata) !== JSON.stringify(expectedMetadata))
      throw new Error('Demonstration formula or recognition metadata was altered.');
  }
}
