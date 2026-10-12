import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, CFOPStageId } from '../../core/types';
import { invertTeachingMoves, isTeachingMove } from '../../core/teaching-moves';
import { firstTwoLayersSolved } from '../shared/pieces';
import { CFOP_ALGORITHMS, LAST_LAYER_CASES } from './catalog';
import { checkCFOPStage } from './stages';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
it('defines exactly ten OLL cases and six PLL cases', () => {
  expect(LAST_LAYER_CASES.filter(c => c.id.startsWith('oll-'))).toHaveLength(10);
  expect(LAST_LAYER_CASES.filter(c => c.id.startsWith('pll-'))).toHaveLength(6);
});
it('uses canonical formulas that preserve F2L and have their advertised prerequisites', () => {
  const solved = engine.apply(engine.solved(), ['x2']);
  for (const entry of LAST_LAYER_CASES) {
    const alg = CFOP_ALGORITHMS[entry.id];
    expect(alg.moves.every(isTeachingMove)).toBe(true);
    expect(alg.moves.some(m => m.startsWith('M'))).toBe(['pll-h', 'pll-z'].includes(entry.id));
    const start = engine.apply(solved, invertTeachingMoves(alg.moves));
    expect(firstTwoLayersSolved(engine, start), entry.id).toBe(true);
    expect(engine.equals(engine.apply(start, alg.moves), solved)).toBe(true);
    const previous: Record<string, CFOPStageId> = { 'cfop-oll-edges': 'cfop-f2l', 'cfop-oll-corners': 'cfop-oll-edges', 'cfop-pll-corners': 'cfop-oll-corners', 'cfop-pll-edges': 'cfop-pll-corners' };
    expect(checkCFOPStage(engine, start, previous[entry.stage]), entry.id).toBe(true);
    expect(checkCFOPStage(engine, start, entry.stage), entry.id).toBe(false);
  }
});
it('keeps the dot formula segments contiguous and complete', () => {
  const dot = CFOP_ALGORITHMS['oll-edge-dot'];
  expect(dot.segments?.[0].start).toBe(0);
  expect(dot.segments?.at(-1)?.end).toBe(dot.moves.length);
  for (let i = 1; i < (dot.segments?.length ?? 0); i++) expect(dot.segments![i].start).toBe(dot.segments![i - 1].end);
});
