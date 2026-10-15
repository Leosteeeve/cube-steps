import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { ALGORITHM_REGISTRY } from '../src/algorithms/registry';
import { getCaseFixture } from '../src/algorithms/fixtures';
import { prepareLabInput } from '../src/lab/input';
import { createLabFrame } from '../src/lab/frames';
import { LAB_COLOR_ORDER } from '../src/lab/search';
import { observeF2LPairs } from '../src/methods/cfop/f2l-cases';
import { f2lSignature, U_ALIGNMENTS } from '../src/methods/advanced/f2l/recognize';
import { recognizeAdvancedOLL } from '../src/methods/advanced/recognize-oll';
import { recognizeAdvancedPLL } from '../src/methods/advanced/recognize-pll';
import { advancedAufMoves } from '../src/methods/advanced/last-layer';
import { EXECUTION_CATALOG } from '../src/lab/execution/profiles';
import { physicalCross, physicalF2L, physicalPairSolved } from './helpers/lab-replay';
import type { F2LTarget } from '../src/methods/advanced/f2l/types';
import type { TeachingMove } from '../src/core/types';

it('replays 41 F2L cases across four slots, four holds and six physical bottoms with every admitted variant', async () => {
  const e = await createCubeEngine(),
    independent = await createCubeEngine(),
    input = prepareLabInput(e, { kind: 'scramble', moves: [] });
  const cases = Object.values(ALGORITHM_REGISTRY.cases).filter((c) => c.family === 'f2l'),
    seen = new Set<string>();
  expect(cases).toHaveLength(41);
  let combinations = 0;
  for (const bottom of LAB_COLOR_ORDER) {
    const frame = createLabFrame(e, input, {
      bottom,
      front: ['green', 'blue'].includes(bottom) ? 'white' : 'green',
    });
    for (const c of cases)
      for (const slot of ['fr', 'fl', 'br', 'bl'])
        for (const y of [[], ['y'], ["y'"], ['y2']] as TeachingMove[][]) {
          const fixture = getCaseFixture(`${c.id}/${slot}/u0`)!;
          const start = e.apply(fixture.initial, y),
            target = observeF2LPairs(e, start).find(
              (p) => p.cornerId === fixture.target!.cornerId,
            )! as F2LTarget;
          const candidates = c.variantIds
            .map((id) => ALGORITHM_REGISTRY.variants[id])
            .filter((v) => v.targetSlot === target.slot);
          expect(candidates.length).toBeGreaterThan(0);
          for (const v of candidates) {
            const u = U_ALIGNMENTS.find(
              (u) => f2lSignature(e, e.apply(start, u), target) === v.startSignature,
            );
            expect(u, `${c.id} ${slot} ${y} ${v.id}`).toBeDefined();
            const before = frame.toPhysical(start),
              after = independent.apply(before, [...u!, ...v.moves]);
            expect(physicalCross(independent, after, bottom)).toBe(true);
            expect(
              physicalPairSolved(
                independent,
                after,
                bottom,
                frame.physicalPieceId(target.cornerId),
              ),
            ).toBe(true);
            const protectedIds = independent
              .observe(before)
              .corners.filter(
                (p) =>
                  Object.values(p.stickers).includes(bottom) &&
                  physicalPairSolved(independent, before, bottom, p.id),
              )
              .map((p) => p.id);
            expect(
              protectedIds.every((id) => physicalPairSolved(independent, after, bottom, id)),
            ).toBe(true);
            expect(EXECUTION_CATALOG.formulas[v.id].moves).toEqual(v.moves);
            seen.add(v.id);
          }
          combinations++;
        }
  }
  expect(combinations).toBe(41 * 4 * 4 * 6);
  expect(seen.size).toBe(
    Object.values(ALGORITHM_REGISTRY.variants).filter((v) => v.targetSlot).length,
  );
}, 120_000);

it('replays every OLL and PLL fixture in six colors including setup and final alignment', async () => {
  const e = await createCubeEngine(),
    independent = await createCubeEngine(),
    input = prepareLabInput(e, { kind: 'scramble', moves: [] });
  const cases = Object.values(ALGORITHM_REGISTRY.cases).filter((c) => c.family !== 'f2l');
  expect(cases.filter((c) => c.family === 'oll')).toHaveLength(57);
  expect(cases.filter((c) => c.family === 'pll')).toHaveLength(21);
  for (const bottom of LAB_COLOR_ORDER) {
    const frame = createLabFrame(e, input, {
      bottom,
      front: ['green', 'blue'].includes(bottom) ? 'white' : 'green',
    });
    for (const c of cases)
      for (const id of c.fixtureIds) {
        const fixture = getCaseFixture(id)!,
          match = (c.family === 'oll' ? recognizeAdvancedOLL : recognizeAdvancedPLL)(
            e,
            fixture.initial,
          )!;
        const v = ALGORITHM_REGISTRY.variants[match.variantId],
          steps = [...match.setup, ...v.moves];
        let after = independent.apply(frame.toPhysical(fixture.initial), steps);
        expect(physicalF2L(independent, after, bottom)).toBe(true);
        if (c.family === 'pll') {
          const canonicalAfter = e.apply(fixture.initial, steps),
            auf = advancedAufMoves(e, canonicalAfter)!;
          expect(auf).not.toBeNull();
          after = independent.apply(after, auf);
          expect(independent.isSolved(after)).toBe(true);
        } else {
          const o = independent.observe(after);
          expect(
            [...o.edges, ...o.corners]
              .filter((p) => p.slot.includes('U'))
              .every((p) => p.stickers.U === o.centers.U),
          ).toBe(true);
        }
      }
  }
});
