import type { Color, CubeEngine, CubeState, Face, PieceObservation } from '../../src/core/types';
import type { LabContext } from '../../src/lab/finalize';
import type { LabCoverage, LabInput, LabRoute } from '../../src/lab/types';
import type { CrossTable } from '../../src/methods/advanced/cross/table';
import { rankCross, type CrossCoordinate } from '../../src/methods/advanced/cross/coordinates';
import { EDGE_SLOTS } from '../../src/core/observations';
import { resolveSolveInput } from '../../src/core/solve-input';
import { createLabBudget } from '../../src/lab/budget';
import { searchLab, LAB_COLOR_ORDER } from '../../src/lab/search';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
const solved = (piece: PieceObservation, centers: Record<Face, Color>) =>
  Object.entries(piece.stickers).every(([face, color]) => centers[face as Face] === color);
export function physicalCross(engine: CubeEngine, state: CubeState, bottom: Color): boolean {
  const o = engine.observe(state);
  return (
    o.centers.D === bottom &&
    o.edges
      .filter((p) => Object.values(p.stickers).includes(bottom))
      .every((p) => solved(p, o.centers))
  );
}
export function physicalF2L(engine: CubeEngine, state: CubeState, bottom: Color): boolean {
  const o = engine.observe(state);
  return (
    o.centers.D === bottom &&
    [...o.corners, ...o.edges]
      .filter((p) => !Object.values(p.stickers).includes(o.centers.U))
      .every((p) => solved(p, o.centers))
  );
}
export function physicalPairSolved(
  engine: CubeEngine,
  state: CubeState,
  bottom: Color,
  cornerId: string,
): boolean {
  const o = engine.observe(state),
    c = o.corners.find((p) => p.id === cornerId);
  if (!c || !Object.values(c.stickers).includes(bottom)) return false;
  const colors = Object.values(c.stickers).filter((c) => c !== bottom),
    e = o.edges.find((p) => Object.values(p.stickers).every((c) => colors.includes(c)));
  return !!e && solved(c, o.centers) && solved(e, o.centers);
}
/** Direct sticker-coordinate extraction; independent of the Lab color/identity adapter. */
export function physicalCrossMinimum(
  engine: CubeEngine,
  state: CubeState,
  table: CrossTable,
): number {
  const o = engine.observe(state),
    positions: number[] = [],
    orientations: number[] = [];
  for (const face of ['F', 'R', 'B', 'L'] as const) {
    const edge = o.edges.find(
      (p) =>
        Object.values(p.stickers).includes(o.centers.D) &&
        Object.values(p.stickers).includes(o.centers[face]),
    )!;
    positions.push(EDGE_SLOTS.indexOf(edge.slot));
    orientations.push(edge.stickers[edge.slot[0] as Face] === o.centers.D ? 0 : 1);
  }
  return table.distances[rankCross({ positions, orientations } as CrossCoordinate)];
}
/** This replay never converts an endpoint through LabFrame.toPhysical. */
export function independentLabReplay(engine: CubeEngine, route: LabRoute, table: CrossTable): void {
  const original = resolveSolveInput(engine, route.input),
    bottom = route.startHold.bottom;
  assert(engine.equals(original, route.initial), 'Original input mismatch');
  assert(
    engine.equals(engine.apply(engine.solved(), route.setupMoves), original),
    'Setup mismatch',
  );
  const held = engine.apply(original, route.positioningMoves);
  assert(
    physicalCrossMinimum(engine, held, table) === route.crossMinimum,
    'Independent cross reference mismatch',
  );
  let state = original,
    turns = 0,
    rotations = 0;
  for (const action of route.actions) {
    assert(engine.equals(state, action.before), 'Action start mismatch');
    for (const move of action.moves) state = engine.apply(state, [move]);
    assert(engine.equals(state, action.after), 'Action endpoint mismatch');
    if (action.section === 'lab-cross' || action.section === 'lab-f2l')
      for (const move of action.moves) {
        if (/^[xyz]/.test(move)) rotations++;
        else turns += /^[MES]/.test(move) ? 2 : 1;
      }
    const predicate = action.checkpoint.predicate,
      o = engine.observe(state);
    assert(
      action.checkpoint.protectedIds.every((id) => physicalPairSolved(engine, state, bottom, id)),
      'Protected physical pair was lost',
    );
    if (predicate === 'cross' || predicate === 'pair')
      assert(physicalCross(engine, state, bottom), 'False cross checkpoint');
    if (predicate === 'pair')
      assert(physicalPairSolved(engine, state, bottom, action.targets[0]), 'False pair checkpoint');
    if (['f2l', 'oll', 'pll', 'solved'].includes(predicate))
      assert(physicalF2L(engine, state, bottom), 'False F2L checkpoint');
    if (['oll', 'pll', 'solved'].includes(predicate))
      assert(
        [...o.edges, ...o.corners]
          .filter((p) => Object.values(p.stickers).includes(o.centers.U))
          .every((p) => p.stickers.U === o.centers.U),
        'False OLL checkpoint',
      );
    if (['pll', 'solved'].includes(predicate))
      assert(
        [[], ['U'], ["U'"], ['U2']].some((u) =>
          engine.isSolved(engine.apply(state, u as ('U' | "U'" | 'U2')[])),
        ),
        'False PLL checkpoint',
      );
    if (predicate === 'solved') assert(engine.isSolved(state), 'False solved checkpoint');
  }
  assert(
    engine.isSolved(state) && engine.equals(state, route.final),
    'Final physical solve mismatch',
  );
  if (route.score.rated)
    assert(
      route.score.T === turns && route.score.R === rotations,
      'Independent turn count mismatch',
    );
}
export function collectLabSeeds(
  context: LabContext,
  input: LabInput,
  colors: readonly Color[] = LAB_COLOR_ORDER,
) {
  const budget = createLabBudget({ now: () => 0 }),
    start = performance.now(),
    routes: LabRoute[] = [];
  let coverage: LabCoverage | undefined,
    previous = 0,
    maxWorkGap = 0;
  const iterator = searchLab(
    context,
    input,
    { allowedColors: colors, modelVersion: 'lab-execution-v1' },
    budget,
  );
  for (const event of iterator) {
    const n = budget.snapshot().operations;
    maxWorkGap = Math.max(maxWorkGap, n - previous);
    previous = n;
    if (
      event.kind === 'candidate' &&
      !routes.some((r) => r.startHold.bottom === event.route.startHold.bottom)
    )
      routes.push(event.route);
    if (event.kind === 'progress' || event.kind === 'done') coverage = event.coverage;
    if (event.kind === 'progress' && colors.every((c) => coverage!.colors[c]?.status === 'seeded'))
      break;
  }
  assert(
    routes.length === colors.length,
    `Only ${routes.length}/${colors.length} colors seeded: ${JSON.stringify(coverage)}`,
  );
  assert(budget.snapshot().entries === 0, 'Search retained entries after caller stopped');
  return {
    routes,
    coverage: coverage!,
    operations: budget.snapshot().operations,
    elapsedMs: performance.now() - start,
    maxWorkGap,
  };
}
