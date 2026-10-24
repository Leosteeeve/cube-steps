import type { CubeEngine, CubeState } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { rouxReferenceState } from '../../roux/frame';
import { U_SETUPS } from '../../roux/corners/recognize';
import { blockComplete, cornerOffset } from '../../roux/predicates';
import { createRouxFrameMap } from '../frames';
import type { RouxFrame } from '../types';
import type { CmllCatalog, CmllMatch } from './types';
import { CMLL_CATALOG, deeplyFrozen } from './catalog';
const parity = (p: readonly number[]) =>
  p.reduce((n, x, i) => n + p.slice(i + 1).filter((y) => y < x).length, 0) % 2;
export function assertPieceCoordinates(s: CubeState): void {
  for (const [name, size, base] of [
    ['EDGES', 12, 2],
    ['CORNERS', 8, 3],
    ['CENTERS', 6, 1],
  ] as const) {
    const orbit = s.data[name];
    if (
      !orbit ||
      orbit.pieces.length !== size ||
      new Set(orbit.pieces).size !== size ||
      orbit.pieces.some((n) => !Number.isInteger(n) || n < 0 || n >= size) ||
      orbit.orientation.length !== size ||
      (base > 1 &&
        (orbit.orientation.some((n) => !Number.isInteger(n) || n < 0 || n >= base) ||
          orbit.orientation.reduce((a, b) => a + b, 0) % base))
    )
      throw Error('Illegal piece or orientation in CMLL domain.');
  }
  if (
    (parity(s.data.EDGES.pieces) + parity(s.data.CORNERS.pieces) + parity(s.data.CENTERS.pieces)) %
    2
  )
    throw Error('Illegal permutation parity in CMLL domain.');
}
export function assertCmllDomain(e: CubeEngine, s: CubeState): void {
  assertPieceCoordinates(s);
  if (!blockComplete(e, s, 'left') || !blockComplete(e, s, 'right'))
    throw Error('Complete both blocks before CMLL.');
}
export const cmllCornerKey = (s: CubeState) =>
  s.data.CORNERS.pieces
    .slice(0, 4)
    .map((p, i) => `${p}:${s.data.CORNERS.orientation[i]}`)
    .join('/');
const indexes = new WeakMap<
  CmllCatalog,
  Map<string, { caseId: string; setup: (typeof U_SETUPS)[number] }>
>();
export function cmllIndex(e: CubeEngine, c: CmllCatalog) {
  const cached = indexes.get(c);
  if (cached) return cached;
  const index = new Map<string, { caseId: string; setup: (typeof U_SETUPS)[number] }>(),
    ref = rouxReferenceState(e);
  for (const group of c.cases) {
    const variant = c.variants[group.variantIds.find((id) => c.variants[id].default)!];
    if (!variant) throw Error('CMLL primary is missing.');
    for (const offset of U_SETUPS)
      for (const setup of U_SETUPS) {
        const state = e.apply(ref, [
            ...offset,
            ...invertTeachingMoves(variant.moves),
            ...invertTeachingMoves(setup),
          ]),
          key = cmllCornerKey(state),
          prior = index.get(key);
        if (prior && prior.caseId !== group.id)
          throw Error(`Duplicate CMLL classes: ${group.id} and ${prior.caseId}.`);
        if (!prior) index.set(key, { caseId: group.id, setup });
      }
  }
  if (deeplyFrozen(c)) indexes.set(c, index);
  return index;
}
export function recognizeCmll(
  e: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
  catalog: CmllCatalog = CMLL_CATALOG,
): CmllMatch {
  assertPieceCoordinates(state);
  const canonical = createRouxFrameMap(e, frame.id).toCanonical(state);
  assertCmllDomain(e, canonical);
  if (cornerOffset(e, canonical) !== null) return { caseId: 'solved', setup: [] };
  const match = cmllIndex(e, catalog).get(cmllCornerKey(canonical));
  if (!match) throw Error('No admitted CMLL case matches the legal corners.');
  const group = catalog.cases.find((c) => c.id === match.caseId)!,
    o = e.observe(state),
    top = frame.centers.U;
  const corners = o.corners.filter((p) => p.slot.includes('U'));
  return {
    ...match,
    family: group.family,
    targetIds: corners.map((p) => p.id),
    recognition: `${group.family} · ${group.label}. Top color ${top}; compare corner stickers only: ${corners
      .map(
        (p) =>
          `${p.slot}: ${Object.entries(p.stickers)
            .map(([face, color]) => `${color} ${face}`)
            .join(', ')}`,
      )
      .join('; ')}. The edge stickers do not determine this case.`,
  };
}
