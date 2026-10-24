import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { CMLL_CATALOG } from './catalog';
import { createCmllDemonstration } from './demonstration';
import { ROUX_FRAMES } from '../frames';
import { recognizeCmll } from './recognize';
import { blockCompleteInFrame, observeAdvancedFrame } from '../predicates';
import { createPlaybackTimeline } from '../../../player/playback-timeline';
import { buildPlaybackInitialSetup } from '../../../player/initial-setup';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
it('replays all 42 classes, admitted variants, eight holds and four AUF setups as corner demonstrations', () => {
  let demonstrations = 0;
  for (const group of CMLL_CATALOG.cases)
    for (const variantId of group.variantIds)
      for (const frame of ROUX_FRAMES)
        for (const auf of [0, 1, 2, 3] as const) {
          const demo = createCmllDemonstration(e, group.id, variantId, frame.id, auf);
          expect(demo.source.kind).toBe('cmll');
          const timeline = createPlaybackTimeline(e, demo.source),
            setup = buildPlaybackInitialSetup(e, demo.source);
          expect(e.equals(e.apply(e.solved(), setup), timeline.states[0])).toBe(true);
          expect(recognizeCmll(e, timeline.states[0], frame).caseId).toBe(group.id);
          expect(
            e.equals(e.apply(timeline.states[0], timeline.moves), timeline.states.at(-1)!),
          ).toBe(true);
          expect(blockCompleteInFrame(e, timeline.states.at(-1)!, frame, 'left')).toBe(true);
          expect(blockCompleteInFrame(e, timeline.states.at(-1)!, frame, 'right')).toBe(true);
          expect(
            observeAdvancedFrame(e, timeline.states.at(-1)!, frame).cornerOffset,
          ).not.toBeNull();
          expect(timeline.completion.title).toBe('CMLL complete.');
          expect(timeline.sections.map((s) => s.id)).toEqual(['cmll-setup', 'cmll-formula']);
          expect(timeline.actions.at(-1)!.action.algorithmId).toBe(variantId);
          expect(demo.recognition.length).toBeGreaterThan(0);
          expect(demo.holding).toContain(frame.left);
          demonstrations++;
        }
  expect(demonstrations).toBe(46 * 8 * 4);
}, 120000);
it('rejects a foreign variant, invalid hold, unknown case and invalid AUF', () => {
  const a = CMLL_CATALOG.cases[0],
    b = CMLL_CATALOG.cases[1];
  for (const args of [
    [a.id, b.variantIds[0], 'white-blue', 0],
    ['unknown', a.variantIds[0], 'white-blue', 0],
    [a.id, a.variantIds[0], 'blue-white', 0],
    [a.id, a.variantIds[0], 'white-blue', 4],
  ])
    expect(() =>
      createCmllDemonstration(
        e,
        ...(args as Parameters<typeof createCmllDemonstration> extends [CubeEngine, ...infer Rest]
          ? Rest
          : never),
      ),
    ).toThrow();
});
