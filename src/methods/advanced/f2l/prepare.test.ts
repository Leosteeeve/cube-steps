import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { canonicalTargets, pairPlacement } from '../../../../tests/fixtures/advanced-f2l';
import { enumerateF2LPreparations } from './prepare';
import { recognizeAdvancedF2L } from './recognize';
import { DEFAULT_F2L_LIMITS } from './types';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { F2L_CATALOG } from '../../../algorithms/data/f2l';
import { CORNER_SLOTS } from '../../../core/observations';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('extracts_solved_corner_with_trapped_edge', () => {
  const target = canonicalTargets(engine).find((t) => t.slot === 'FR')!;
  const solved = engine.apply(engine.solved(), ['z2']);
  const home = engine.observe(solved).corners.find((c) => c.id === target.cornerId)!.slot;
  const index = solved.data.CORNERS.pieces.indexOf(
    ['UFR', 'URB', 'UBL', 'ULF'].indexOf(target.cornerId),
  );
  const state = pairPlacement(
    engine,
    target,
    home,
    solved.data.CORNERS.orientation[index],
    'BR',
    1,
  );
  const preparations = enumerateF2LPreparations(engine, state, target);
  expect(preparations.length).toBeGreaterThan(0);
  for (const p of preparations) {
    expect(recognizeAdvancedF2L(engine, p.state, target)).not.toBeNull();
    expect(preservesF2L(engine, state, p.state)).toBe(true);
    expect(
      engine.equals(
        engine.apply(
          state,
          p.actions.flatMap((a) => a.moves),
        ),
        p.state,
      ),
    ).toBe(true);
    expect(p.actions.filter((a) => a.kind === 'algorithm').length).toBeLessThanOrEqual(2);
  }
});
it('preserves_every_protected_slot_combination', () => {
  for (let mask = 1; mask < 16; mask++) {
    let state = engine.apply(engine.solved(), ['z2']);
    // Independently open chosen slots with complete insertion inverses.
    const opens: TeachingMove[][] = [
      ['R', 'U', "R'"],
      ["L'", 'U', 'L'],
      ['L', 'U', "L'"],
      ["R'", 'U', 'R'],
    ];
    for (let i = 0; i < 4; i++) if (mask & (1 << i)) state = engine.apply(state, opens[i]);
    for (const target of observeF2LPairs(engine, state).filter((p) => !p.solved)) {
      const preparations = enumerateF2LPreparations(engine, state, target as never);
      expect(preparations.length).toBeGreaterThan(0);
      for (const p of preparations) {
        expect(preservesF2L(engine, state, p.state)).toBe(true);
        for (const a of p.actions.filter((a) => a.kind === 'algorithm'))
          expect(a.moves).toEqual(F2L_CATALOG.preparations[a.algorithmId!].moves);
      }
    }
  }
});
it('fails_bounded_preparation_and_skips_solved_pairs', () => {
  const solved = engine.apply(engine.solved(), ['z2']),
    target = canonicalTargets(engine)[0];
  expect(enumerateF2LPreparations(engine, solved, target)).toEqual([]);
  const state = engine.apply(solved, ['R', 'U', "R'"]);
  const unsolved = observeF2LPairs(engine, state).find((p) => !p.solved)!;
  expect(() =>
    enumerateF2LPreparations(engine, state, unsolved as never, {
      ...DEFAULT_F2L_LIMITS,
      maxPreparationStates: 0,
    }),
  ).toThrow(/budget/i);
  expect(() =>
    enumerateF2LPreparations(engine, state, unsolved as never, {
      ...DEFAULT_F2L_LIMITS,
      maxPreparationStates: 1,
    }),
  ).toThrow(/budget/i);
});
it('prepares_every_legal_target_position_and_orientation_without_disturbing_completed_pairs', () => {
  for (const target of canonicalTargets(engine))
    for (const c of CORNER_SLOTS)
      for (let co = 0; co < 3; co++) {
        for (const e of ['UF', 'UR', 'UB', 'UL', 'FR', 'FL', 'BR', 'BL'])
          for (let eo = 0; eo < 2; eo++) {
            const state = pairPlacement(engine, target, c, co, e, eo);
            if (observeF2LPairs(engine, state).find((p) => p.cornerId === target.cornerId)!.solved)
              continue;
            const preparations = enumerateF2LPreparations(engine, state, target);
            expect(preparations.length, `${target.slot} ${c}/${co} ${e}/${eo}`).toBeGreaterThan(0);
            for (const p of preparations) {
              expect(preservesF2L(engine, state, p.state)).toBe(true);
              expect(recognizeAdvancedF2L(engine, p.state, target)).not.toBeNull();
            }
          }
      }
}, 120000);
