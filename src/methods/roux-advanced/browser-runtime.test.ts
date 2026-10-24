import { expect, it, vi } from 'vitest';
import { loadTestAdvancedRouxAssets } from '../../../tests/helpers/roux-advanced-assets';
import { createCubeEngine } from '../../core/cube';
import { ROUX_FRAMES } from './frames';
import { createAdvancedRouxPlaybackLoader } from './browser-runtime';
it('shares verified assets but captures independent white and yellow holding predicates', async () => {
  const assets = await loadTestAdvancedRouxAssets(),
    e = await createCubeEngine(),
    load = vi.fn(async () => assets),
    loader = createAdvancedRouxPlaybackLoader(load);
  const [white, yellow] = await Promise.all([
    loader.prepare('white-blue'),
    loader.prepare('yellow-red'),
  ]);
  expect(load).toHaveBeenCalledTimes(1);
  expect(white).not.toBe(yellow);
  expect(loader.get('white-blue')).toBe(white);
  const state = e.apply(
    e.solved(),
    ROUX_FRAMES.find((f) => f.id === 'white-blue')!.positioningMoves,
  );
  expect(white.checkStage(e, state, 'ar-last-four')).toBe(true);
  expect(yellow.checkStage(e, state, 'ar-last-four')).toBe(false);
});
it('bounds failed playback loads and retries without retaining a timed-out result', async () => {
  const assets = await loadTestAdvancedRouxAssets();
  vi.useFakeTimers();
  try {
    const load = vi.fn(() => new Promise<typeof assets>(() => {})),
      loader = createAdvancedRouxPlaybackLoader(load);
    const result = loader.prepare('white-blue').catch((e) => e.message);
    await vi.advanceTimersByTimeAsync(30000);
    expect(await result).toMatch(/timed out/);
    load.mockResolvedValueOnce(assets);
    expect(await loader.prepare('white-blue')).toHaveProperty('checkStage');
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
