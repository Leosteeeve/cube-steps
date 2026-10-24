import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { validateAdvancedLseBytes } from '../src/methods/roux-advanced/lse/assets';
import { verifyAdvancedLseDomain } from '../src/methods/roux-advanced/lse/model';
it('verifies every legal M/U coordinate and every physical primitive and policy transition', async () => {
  const e = await createCubeEngine(),
    assets = await validateAdvancedLseBytes(
      new Uint8Array(await readFile('src/methods/roux-advanced/data/lse-advanced.bin')),
    );
  const report = verifyAdvancedLseDomain(e, assets);
  expect(report.reachable).toBe(184320);
  expect(report.verified).toBe(report.reachable);
  expect(report.failures).toEqual([]);
}, 240000);
