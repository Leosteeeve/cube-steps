import { expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { loadTestAdvancedRouxAssets } from '../../tests/helpers/roux-advanced-assets';
import { ROUX_FRAMES } from '../methods/roux-advanced/frames';
import { prepareRouxInput } from '../methods/roux-advanced/input';
import { createRouxSearchBudget } from '../methods/roux-advanced/budget';
import { planBaselineBlocks } from '../methods/roux-advanced/blocks/baseline';
import { completeRouxCandidate } from '../methods/roux-advanced/complete';
import { prepareRouxPlayback } from './playback';
import { createPlaybackTimeline } from '../player/playback-timeline';
import { buildPlaybackInitialSetup } from '../player/initial-setup';
it('plays a separately verified yellow-frame Roux route without any CFOP assets', async () => {
  const e = await createCubeEngine(),
    assets = await loadTestAdvancedRouxAssets(),
    frame = ROUX_FRAMES.find((f) => f.id === 'yellow-red')!;
  const input = prepareRouxInput(e, { kind: 'scramble', moves: ['R', 'F', 'U'] }),
    budget = createRouxSearchBudget('normal', { now: () => 0 });
  const g = planBaselineBlocks(e, input, frame, assets.beginner, budget);
  let next = g.next();
  while (!next.done) next = g.next();
  const route = completeRouxCandidate(e, input, frame, next.value, assets, budget),
    prepared = prepareRouxPlayback(e, route, assets),
    source = { kind: 'roux-lab' as const, prepared };
  expect(createPlaybackTimeline(e, source)).toBe(prepared.timeline);
  expect(
    e.equals(e.apply(e.solved(), buildPlaybackInitialSetup(e, source)), route.trace.initial),
  ).toBe(true);
  expect(e.isSolved(prepared.timeline.states.at(-1)!)).toBe(true);
  expect(prepared.label).toContain('yellow');
  expect(prepared.timeline.sections).toHaveLength(6);
  const bad = structuredClone(route);
  bad.boundaries.secondEnd++;
  expect(() => prepareRouxPlayback(e, bad, assets)).toThrow();
});
