import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import type { F2LTarget } from './types';
import { observeF2LPairs } from '../../cfop/f2l-cases';
import { whiteCrossSolved } from '../../shared/pieces';
import { F2L_CATALOG } from '../../../algorithms/data/f2l';
export const SLOT_Y: Record<F2LTarget['slot'], readonly TeachingMove[]> = {
  FR: [],
  BR: ['y'],
  BL: ['y2'],
  FL: ["y'"],
};
export const U_ALIGNMENTS: readonly (readonly TeachingMove[])[] = [[], ['U'], ["U'"], ['U2']];
/** Virtual coordinate rotation for recognition only; oriented variants contain actual moves. */
export function f2lSignature(engine: CubeEngine, state: CubeState, target: F2LTarget): string {
  const pair = observeF2LPairs(engine, state).find(
    (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
  );
  if (!pair || !SLOT_Y[pair.slot as F2LTarget['slot']])
    throw new Error('Invalid F2L target identity.');
  const o = engine.observe(engine.apply(state, SLOT_Y[pair.slot as F2LTarget['slot']]));
  const c = o.corners.find((p) => p.id === target.cornerId)!,
    e = o.edges.find((p) => p.id === target.edgeId)!;
  const white = Object.entries(c.stickers).find(([, color]) => color === 'white')?.[0];
  const front = Object.entries(e.stickers).find(([, color]) => color === o.centers.F)?.[0];
  return `${pair.slot}|${c.slot}:${white}:${e.slot}:${front}`;
}
export function canonicalF2LSignature(
  engine: CubeEngine,
  state: CubeState,
  target: F2LTarget,
): string {
  // U alignment does not change the case. The slot is removed after virtual normalization.
  return U_ALIGNMENTS.map(
    (m) => f2lSignature(engine, engine.apply(state, m), target).split('|')[1],
  ).sort()[0];
}
export function isAdmissibleF2L(engine: CubeEngine, state: CubeState, target: F2LTarget): boolean {
  const signature = f2lSignature(engine, state, target).split('|')[1],
    [c, , e] = signature.split(':');
  return (c.startsWith('U') || c === 'DRF') && (e.startsWith('U') || e === 'FR');
}
export function recognizeAdvancedF2L(
  engine: CubeEngine,
  state: CubeState,
  target: F2LTarget,
): { caseId: string; slot: F2LTarget['slot'] } | null {
  if (engine.observe(state).centers.D !== 'white' || !whiteCrossSolved(engine, state)) return null;
  const pair = observeF2LPairs(engine, state).find(
    (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
  );
  if (!pair || pair.solved || !isAdmissibleF2L(engine, state, target)) return null;
  const key = canonicalF2LSignature(engine, state, target);
  const found = Object.values(F2L_CATALOG.cases).find((c) => c.canonicalSignature === key);
  return found ? { caseId: found.id, slot: pair.slot as F2LTarget['slot'] } : null;
}
