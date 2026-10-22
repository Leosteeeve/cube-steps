import { expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { loadTestRouxAssets } from '../../../tests/helpers/roux';
import { solveRoux } from './solve';
import { verifyTrace } from '../shared/verification';
import { createRouxPlaybackLoader } from './browser-runtime';
vi.mock('./blocks/policies', async (original) => ({
  ...(await original<typeof import('./blocks/policies')>()),
  generateBlockPolicies: vi.fn(() => {
    throw Error('Browser regenerated block policies');
  }),
}));
vi.mock('./lse/policies', async (original) => ({
  ...(await original<typeof import('./lse/policies')>()),
  generateLsePolicies: vi.fn(() => {
    throw Error('Browser regenerated LSE policies');
  }),
}));
it('shares one asynchronous asset load and verifies a cold trace without generating policies', async () => {
  const assets = await loadTestRouxAssets(),
    engine = await createCubeEngine();
  let release!: () => void;
  const loader = vi.fn(
    () =>
      new Promise<typeof assets>((resolve) => {
        release = () => resolve(assets);
      }),
  );
  const load = createRouxPlaybackLoader(loader),
    first = load(),
    second = load();
  expect(first).toBe(second);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(loader).toHaveBeenCalledTimes(1);
  release();
  const runtime = await first;
  expect(await load()).toBe(runtime);
  const result = solveRoux(engine, engine.apply(engine.solved(), ['R', 'U', 'F2']), assets);
  if (!result.ok) throw Error(result.message);
  expect(() => verifyTrace(engine, result.trace, runtime)).not.toThrow();
});
it('rejects failed or unverified loads and permits a fresh retry', async () => {
  const assets = await loadTestRouxAssets();
  const loader = vi
    .fn()
    .mockRejectedValueOnce(Error('offline'))
    .mockResolvedValueOnce({ ...assets })
    .mockResolvedValue(assets);
  const load = createRouxPlaybackLoader(loader);
  await expect(load()).rejects.toThrow('offline');
  await expect(load()).rejects.toThrow(/integrity/);
  await expect(load()).resolves.toHaveProperty('checkAction');
  expect(loader).toHaveBeenCalledTimes(3);
});
