import { expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { loadTestAdvancedRouxAssets } from '../../tests/helpers/roux-advanced-assets';
import { ROUX_FRAMES } from '../methods/roux-advanced/frames';
import { prepareRouxInput } from '../methods/roux-advanced/input';
import { createRouxSearchBudget } from '../methods/roux-advanced/budget';
import { planBaselineBlocks } from '../methods/roux-advanced/blocks/baseline';
import { completeRouxCandidate } from '../methods/roux-advanced/complete';
import { createAdvancedRouxRuntime } from '../methods/roux-advanced/definition';
import { ADVANCED_ROUX_PRESENTATION } from '../methods/roux-advanced/presentation';
import { registerAdvancedRouxFrameRuntime, registerMethodPresentation } from '../methods/registry';
import { createPlaybackTimeline } from './playback-timeline';
import {
  runAdvancedRouxFixture,
  advancedRouxScramble,
} from '../../tests/helpers/advanced-roux-corpus';
import { prepareRouxPlayback } from '../roux-lab/playback';
it('shows the same truthful checkpoint connection in normal and Lab playback', async () => {
  const e = await createCubeEngine(),
    assets = await loadTestAdvancedRouxAssets(),
    { route } = runAdvancedRouxFixture(
      e,
      assets,
      { kind: 'scramble', moves: advancedRouxScramble(15) },
      'white-orange',
    );
  registerMethodPresentation(ADVANCED_ROUX_PRESENTATION);
  registerAdvancedRouxFrameRuntime(route.frameId, createAdvancedRouxRuntime(assets, route.frameId));
  const normal = createPlaybackTimeline(e, {
      kind: 'solve',
      session: { input: route.input.source, trace: route.trace },
    }),
    lab = prepareRouxPlayback(e, route, assets).timeline;
  expect(normal.sections[3].connection).toContain('connect them as R2');
  expect(lab.sections[3].connection).toEqual(normal.sections[3].connection);
  expect(normal.moves).toEqual(lab.moves);
  expect(e.equals(normal.states[normal.sections[3].start], route.trace.stages[2].after)).toBe(true);
});
it('requires the prepared frame-specific runtime and never falls through to CFOP assets', async () => {
  const e = await createCubeEngine(),
    assets = await loadTestAdvancedRouxAssets(),
    input = prepareRouxInput(e, { kind: 'scramble', moves: [] }),
    frame = ROUX_FRAMES.find((f) => f.id === 'yellow-red')!,
    b = createRouxSearchBudget('normal', { now: () => 0 });
  const g = planBaselineBlocks(e, input, frame, assets.beginner, b);
  let n = g.next();
  while (!n.done) n = g.next();
  const route = completeRouxCandidate(e, input, frame, n.value, assets, b),
    source = { kind: 'solve' as const, session: { input: input.source, trace: route.trace } };
  registerMethodPresentation(ADVANCED_ROUX_PRESENTATION);
  expect(() => createPlaybackTimeline(e, source)).toThrow(/Roux playback/);
  registerAdvancedRouxFrameRuntime(frame.id, createAdvancedRouxRuntime(assets, frame.id));
  const timeline = createPlaybackTimeline(e, source);
  expect(timeline.sections).toHaveLength(6);
  expect(e.isSolved(timeline.states.at(-1)!)).toBe(true);
  registerAdvancedRouxFrameRuntime('white-blue', createAdvancedRouxRuntime(assets, 'white-blue'));
  const corrupt = structuredClone(source);
  corrupt.session.trace.rouxAdvanced!.frameId = 'white-blue';
  expect(() => createPlaybackTimeline(e, corrupt)).toThrow();
});
