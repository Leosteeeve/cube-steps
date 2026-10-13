import type {
  CubeEngine,
  CubeState,
  PairTrace,
  TeachingMove,
  CubeObservation,
  Face,
  PieceObservation,
  Color,
} from '../../core/types';
import { CORNER_SLOTS, EDGE_SLOTS } from '../../core/observations';
import { pieceSolved, whiteCrossSolved } from '../shared/pieces';
export interface F2LPair {
  cornerId: string;
  edgeId: string;
  slot: string;
  solved: boolean;
}
export interface F2LMatch {
  caseId: string;
  phase: PairTrace['phase'];
  setup: TeachingMove[];
  algorithmId: string;
  recognition: string;
}
export const U_SETUPS: TeachingMove[][] = [[], ['U'], ['U2'], ["U'"]];
const Y_SETUPS: TeachingMove[][] = [[], ['y'], ['y2'], ["y'"]];
const pairObservations = new WeakMap<CubeEngine, WeakMap<CubeState, readonly F2LPair[]>>();
export function observeF2LPairs(engine: CubeEngine, state: CubeState): readonly F2LPair[] {
  let cache = pairObservations.get(engine);
  const cached = cache?.get(state);
  if (cached) return cached;
  const o = engine.observe(state);
  const pairs = CORNER_SLOTS.slice(0, 4).map((id) => {
    const corner = o.corners.find((p) => p.id === id)!;
    const colors: Color[] = Object.values(corner.stickers).filter((c) => c !== 'white');
    const edge = o.edges.find((p) => Object.values(p.stickers).every((c) => colors.includes(c)))!;
    const slot = EDGE_SLOTS.find((s) =>
      [...s].every((f) => colors.includes(o.centers[f as Face])),
    )!;
    return {
      cornerId: id,
      edgeId: edge.id,
      slot,
      solved: pieceSolved(corner, o) && pieceSolved(edge, o),
    };
  });
  // Only deeply frozen engine states are safe to memoize. Face-entry fixtures
  // and callers can still supply mutable states and get a fresh observation.
  if (
    Object.isFrozen(state) &&
    Object.isFrozen(state.data) &&
    Object.values(state.data).every(
      (orbit) =>
        Object.isFrozen(orbit) &&
        Object.isFrozen(orbit.pieces) &&
        Object.isFrozen(orbit.orientation) &&
        (!orbit.orientationMod || Object.isFrozen(orbit.orientationMod)),
    )
  ) {
    if (!cache) {
      cache = new WeakMap();
      pairObservations.set(engine, cache);
    }
    pairs.forEach(Object.freeze);
    Object.freeze(pairs);
    cache.set(state, pairs);
  }
  return pairs;
}
function pieces(o: CubeObservation, pair: F2LPair): [PieceObservation, PieceObservation] {
  return [
    o.corners.find((p) => p.id === pair.cornerId)!,
    o.edges.find((p) => p.id === pair.edgeId)!,
  ];
}
export function pairSignature(o: CubeObservation, pair: F2LPair): string {
  const [c, e] = pieces(o, pair);
  const white = Object.entries(c.stickers).find(([, color]) => color === 'white')![0];
  return `${c.slot}:${white}:${e.slot}:${e.stickers.U === o.centers.F ? 'F' : 'R'}`;
}
function evidence(o: CubeObservation, pair: F2LPair): string {
  const [c, e] = pieces(o, pair);
  return `Corner ${c.slot} (${Object.entries(c.stickers)
    .map(([f, color]) => `${f} ${color}`)
    .join(', ')}); edge ${e.slot} (${Object.entries(e.stickers)
    .map(([f, color]) => `${f} ${color}`)
    .join(', ')}).`;
}
export function describeF2L(
  o: CubeObservation,
  pair: F2LPair,
  caseId: string,
  phase: PairTrace['phase'],
): string {
  const reasons: Record<string, string> = {
    'f2l-trapped':
      'Use the occupied, unsolved slot at front-right. Keep the other target clear of the opening before lifting the trapped piece.',
    'f2l-connected':
      'The adjacent corner and edge show matching colors on both shared faces: they form one connected block. Align it beside its front-right slot.',
    'f2l-white-up': 'White faces up: change the corner orientation with the empty slot.',
    'f2l-matching':
      'The two upper stickers match. Use the empty slot to bring the matching side stickers together.',
    'f2l-opposite':
      'The two upper stickers are different. Separate any wrong connection and use the empty slot to arrange the pair.',
  };
  return `${evidence(o, pair)} ${reasons[caseId] ?? ''}${phase === 'pair' ? ' This maneuver forms the connected block.' : ''}`;
}
// Twenty-two normalized, separated arrangements. Connected arrangements use
// the two mirrored insertion predicates below. Each entry is one short
// open-slot / U turn / close-slot maneuver, never a full-case solution.
// Key: white-facing direction, edge position, upper edge sticker relative to
// the target front/right centers. Last value is remaining pairing maneuvers.
type Recipe = readonly [u: 0 | 1 | 2 | 3, algorithm: string, remaining: 0 | 1];
export const F2L_PREPARATIONS: Readonly<Record<string, Recipe>> = {
  'R:UB:F': [0, 'right-toward', 0],
  'F:UL:R': [0, 'left-toward', 0],
  'U:UR:F': [0, 'right-half', 1],
  'U:UL:F': [2, 'right-away', 0],
  'F:UF:F': [0, 'left-toward', 1],
  'U:UF:F': [0, 'left-half', 1],
  'R:UR:R': [0, 'right-toward', 1],
  'U:UB:R': [2, 'left-away', 0],
  'U:UF:R': [0, 'left-half', 1],
  'U:UR:R': [3, 'right-toward', 1],
  'F:UB:F': [3, 'right-away', 0],
  'F:UL:F': [3, 'right-half', 0],
  'U:UB:F': [1, 'right-half', 0],
  'R:UL:F': [0, 'right-toward', 1],
  'U:UL:R': [3, 'left-half', 0],
  'R:UF:F': [0, 'right-half', 1],
  'R:UR:F': [0, 'right-toward', 1],
  'F:UB:R': [0, 'left-toward', 1],
  'F:UR:R': [0, 'right-half', 1],
  'F:UF:R': [0, 'left-toward', 1],
  'R:UL:R': [1, 'left-away', 0],
  'R:UB:R': [1, 'left-half', 0],
};
export function recognizeF2L(
  engine: CubeEngine,
  state: CubeState,
  requested: F2LPair,
): F2LMatch | null {
  const o = engine.observe(state),
    pair = observeF2LPairs(engine, state).find((p) => p.cornerId === requested.cornerId);
  if (!pair || pair.solved || o.centers.D !== 'white' || !whiteCrossSolved(engine, state))
    return null;
  const [corner, edge] = pieces(o, pair);
  if (!corner.slot.includes('U') || !edge.slot.includes('U')) {
    const cornerTrapped = !corner.slot.includes('U');
    const y = Y_SETUPS.find((moves) => {
      const [c, e] = pieces(engine.observe(engine.apply(state, moves)), pair);
      return cornerTrapped ? c.slot === 'DRF' : e.slot === 'FR';
    })!;
    const working = engine.apply(state, y);
    const u = U_SETUPS.find((moves) => {
      const [c, e] = pieces(engine.observe(engine.apply(working, moves)), pair);
      return c.slot !== 'UFR' && e.slot !== 'UB';
    })!;
    return {
      caseId: 'f2l-trapped',
      phase: 'prepare',
      setup: [...y, ...u],
      algorithmId: 'f2l-right-away',
      recognition: describeF2L(o, pair, 'f2l-trapped', 'prepare'),
    };
  }
  const y = Y_SETUPS.find(
    (moves) =>
      observeF2LPairs(engine, engine.apply(state, moves)).find((p) => p.cornerId === pair.cornerId)!
        .slot === 'FR',
  )!;
  const working = engine.apply(state, y);
  for (const u of U_SETUPS) {
    const signature = pairSignature(engine.observe(engine.apply(working, u)), pair);
    const id =
      signature === 'ULF:L:UF:F'
        ? 'f2l-right-toward'
        : signature === 'URB:B:UR:R'
          ? 'f2l-left-toward'
          : null;
    if (id)
      return {
        caseId: 'f2l-connected',
        phase: 'insert',
        setup: [...y, ...u],
        algorithmId: id,
        recognition: describeF2L(o, pair, 'f2l-connected', 'insert'),
      };
  }
  const uIndex = U_SETUPS.findIndex(
    (moves) => pieces(engine.observe(engine.apply(working, moves)), pair)[0].slot === 'UFR',
  );
  const normalized = engine.observe(engine.apply(working, U_SETUPS[uIndex]));
  const recipe = F2L_PREPARATIONS[pairSignature(normalized, pair).slice(4)];
  if (!recipe) return null;
  const [c, e] = pieces(normalized, pair);
  const family =
    c.stickers.U === 'white' ? 'white-up' : c.stickers.U === e.stickers.U ? 'matching' : 'opposite';
  return {
    caseId: `f2l-${family}`,
    phase: recipe[2] === 0 ? 'pair' : 'prepare',
    setup: [...y, ...U_SETUPS[(uIndex + recipe[0]) % 4]],
    algorithmId: `f2l-${recipe[1]}`,
    recognition: describeF2L(o, pair, `f2l-${family}`, recipe[2] === 0 ? 'pair' : 'prepare'),
  };
}
export function preservesF2L(engine: CubeEngine, before: CubeState, after: CubeState): boolean {
  const next = observeF2LPairs(engine, after);
  return (
    whiteCrossSolved(engine, after) &&
    observeF2LPairs(engine, before)
      .filter((p) => p.solved)
      .every((p) => next.find((q) => q.cornerId === p.cornerId)!.solved)
  );
}
