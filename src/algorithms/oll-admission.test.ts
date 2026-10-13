import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { OLL_CATALOG } from './data/oll';
import { admitRegistry } from './admission';
import { getCaseFixture, verifyCaseFixture } from './fixtures';
import { recognizeAdvancedOLL } from '../methods/advanced/recognize-oll';
import { firstTwoLayersSolved } from '../methods/shared/pieces';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('each_oll_formula_preserves_f2l', () => {
  expect(Object.keys(OLL_CATALOG.cases)).toHaveLength(57);
  admitRegistry(OLL_CATALOG);
  let expandedNotation = 0;
  for (const c of Object.values(OLL_CATALOG.cases)) {
    expect(c.variantIds).toHaveLength(1);
    for (const id of c.fixtureIds) {
      const fixture = getCaseFixture(id)!;
      verifyCaseFixture(engine, fixture);
      const match = recognizeAdvancedOLL(engine, fixture.initial)!;
      expect(match.caseId).toBe(c.id);
      const variant = OLL_CATALOG.variants[match.variantId];
      const after = engine.apply(fixture.initial, [...match.setup, ...variant.moves]);
      expect(firstTwoLayersSolved(engine, after)).toBe(true);
      expect(
        [...engine.observe(after).edges, ...engine.observe(after).corners]
          .filter((p) => p.slot.includes('U'))
          .every((p) => p.stickers.U === 'yellow'),
      ).toBe(true);
      if (variant.moves.some((m) => /w|^[MES]/.test(m))) expandedNotation++;
    }
  }
  expect(expandedNotation).toBeGreaterThan(0);
});
