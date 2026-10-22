import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { stateToFacelets } from '../../core/facelets';
import type { CubeEngine } from '../../core/types';
import { NOTATION_ENTRIES, type NotationAmount } from './catalog';
import { buildNotationDemo } from './demonstration';
import { REFERENCE_FACELETS } from './fixtures/reference-facelets';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
for (const entry of NOTATION_ENTRIES)
  for (const amount of ['', "'", '2'] as const) {
    it(`demonstrates ${entry.base}${amount} from the same solved state`, () => {
      const initial = engine.solved(),
        saved = structuredClone(initial);
      const demo = buildNotationDemo(engine, { base: entry.base, amount });
      expect(engine.equals(demo.initial, initial)).toBe(true);
      expect(engine.equals(demo.final, engine.apply(initial, [demo.move]))).toBe(true);
      expect(initial).toEqual(saved);
      if (REFERENCE_FACELETS[demo.move])
        expect(stateToFacelets(demo.final)).toEqual(REFERENCE_FACELETS[demo.move]);
      const inverse: NotationAmount = amount === '2' ? '2' : amount === "'" ? '' : "'";
      expect(
        engine.equals(
          engine.apply(demo.final, [
            buildNotationDemo(engine, { base: entry.base, amount: inverse }).move,
          ]),
          initial,
        ),
      ).toBe(true);
      const quarter = buildNotationDemo(engine, { base: entry.base, amount: '' }).move;
      expect(
        engine.equals(engine.apply(initial, [quarter, quarter, quarter, quarter]), initial),
      ).toBe(true);
      expect(
        engine.equals(
          engine.apply(initial, [quarter, quarter]),
          buildNotationDemo(engine, { base: entry.base, amount: '2' }).final,
        ),
      ).toBe(true);
    });
  }
import { rouxReferenceState } from '../../methods/roux/frame';
it('supports M, its inverse and M2 from the fixed Roux hold', async () => {
  const e = await createCubeEngine(),
    initial = rouxReferenceState(e);
  for (const amount of ['', "'", '2'] as const) {
    const demo = buildNotationDemo(e, { base: 'M', amount }, initial);
    expect(demo.initial).toEqual(initial);
    expect(e.equals(e.apply(e.solved(), demo.setup), initial)).toBe(true);
    expect(
      e.equals(e.apply(demo.final, [amount === '2' ? 'M2' : amount === "'" ? 'M' : "M'"]), initial),
    ).toBe(true);
  }
});
