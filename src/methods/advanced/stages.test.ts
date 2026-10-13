import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { checkAdvancedStage, ADVANCED_STAGE_IDS } from './stages';
import { permuteLastLayer } from '../../../tests/fixtures/advanced-last-layer';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('checks_partial_stages_in_all_frames', () => {
  const solved = engine.apply(engine.solved(), ['z2']);
  const cases: [ReturnType<CubeEngine['solved']>, boolean[]][] = [
    [solved, [true, true, true, true, true]],
    [engine.apply(solved, ['R']), [false, false, false, false, false]],
    [engine.apply(solved, ['R', 'U', "R'"]), [true, false, false, false, false]],
    [engine.apply(solved, ['F', 'R', 'U', "R'", "U'", "F'"]), [true, true, false, false, false]],
    [permuteLastLayer(solved, [1, 0, 2, 3], [1, 0, 2, 3]), [true, true, true, false, false]],
    [engine.apply(solved, ['U']), [true, true, true, true, false]],
  ];
  for (const [state, want] of cases)
    for (const tilt of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][]) {
      for (const spin of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
        const held = engine.apply(state, [...tilt, ...spin]);
        expect(ADVANCED_STAGE_IDS.map((id) => checkAdvancedStage(engine, held, id))).toEqual(want);
        expect(checkAdvancedStage(engine, held, 'cfop-f2l')).toBe(false);
      }
    }
});
