import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { invertTeachingMoves } from '../../core/teaching-moves';
import { CFOP_ALGORITHMS, LAST_LAYER_CASES } from './catalog';
import { recognizeLastLayer } from './cases';
import { checkCFOPStage } from './stages';
import { orientationFixtures, permutationFixtures } from '../../../tests/fixtures/cfop-cases';
import { stateToFacelets, validateFacelets } from '../../core/facelets';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('recognizes every case under all U and y setups using sticker signatures', () => {
  expect(LAST_LAYER_CASES).toHaveLength(16);
  const choices: TeachingMove[][] = [[], ['U'], ['U2'], ["U'"]],
    frames: TeachingMove[][] = [[], ['y'], ['y2'], ["y'"]];
  for (const entry of LAST_LAYER_CASES)
    for (const u of choices)
      for (const y of frames) {
        const start = engine.apply(engine.solved(), [
          'x2',
          ...invertTeachingMoves(CFOP_ALGORITHMS[entry.id].moves),
          ...u,
          ...y,
        ]);
        const found = recognizeLastLayer(engine, start, entry.stage);
        expect(found?.algorithmId, `${entry.id} ${u} ${y}`).toBe(entry.id);
        if (!found) throw new Error(entry.id);
        const after = engine.apply(start, [
          ...found.setup,
          ...CFOP_ALGORITHMS[found.algorithmId].moves,
        ]);
        expect(checkCFOPStage(engine, after, entry.stage), entry.id).toBe(true);
      }
});
it('does not match an orientation signature over broken earlier layers', () => {
  expect(
    recognizeLastLayer(engine, engine.apply(engine.solved(), ['x2', 'R']), 'cfop-oll-corners'),
  ).toBeNull();
  expect(
    recognizeLastLayer(engine, engine.apply(engine.solved(), ['x2']), 'cfop-oll-edges'),
  ).toBeNull();
});
it('classifies independent legal orientation and permutation fixtures', () => {
  const orientations = orientationFixtures(engine),
    permutations = permutationFixtures(engine);
  expect(orientations).toHaveLength(216);
  expect(permutations).toHaveLength(288);
  for (const initial of [...orientations, ...permutations]) {
    expect(validateFacelets(stateToFacelets(initial), engine.solved()).ok).toBe(true);
    let state = engine.apply(initial, ['x2']);
    for (const stage of [
      'cfop-oll-edges',
      'cfop-oll-corners',
      'cfop-pll-corners',
      'cfop-pll-edges',
    ] as const) {
      if (checkCFOPStage(engine, state, stage)) continue;
      const match = recognizeLastLayer(engine, state, stage);
      expect(match, `${stage}: ${JSON.stringify(initial.data)}`).not.toBeNull();
      if (!match) throw new Error(stage);
      state = engine.apply(state, [...match.setup, ...CFOP_ALGORITHMS[match.algorithmId].moves]);
      expect(checkCFOPStage(engine, state, stage)).toBe(true);
    }
  }
});
