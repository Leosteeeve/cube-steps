import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine } from '../src/core/types';
import type { AdvancedRouxAssets } from '../src/methods/roux-advanced/assets';
import { ROUX_FRAMES } from '../src/methods/roux-advanced/frames';
import { loadTestAdvancedRouxAssets } from './helpers/roux-advanced-assets';
import {
  runAdvancedRouxFixture,
  advancedRouxScramble,
  inspectRouxWaste,
} from './helpers/advanced-roux-corpus';
import { rouxStageConnection } from '../src/player/roux-stage-connections';
let e: CubeEngine, assets: AdvancedRouxAssets;
const rows: {
    seed: number;
    frame: string;
    ms: number;
    operations: number;
    turns: number;
    basis: string;
    referenceConnections: number;
  }[] = [],
  failures: { seed: number; frame: string; scramble: string; error: string }[] = [];
const output =
  process.env.CUBESTEPS_ADVANCED_ROUX_CORPUS ?? 'test-results/advanced-roux-corpus.json';
const shard = process.env.CUBESTEPS_ADVANCED_ROUX_SHARD;
const shardIndex = shard === undefined ? -1 : Number(shard);
function save() {
  const times = rows.map((r) => r.ms).sort((a, b) => a - b);
  const report = {
    schemaVersion: 1,
    seedRange: [0, 999],
    frames: ROUX_FRAMES.map((f) => f.id),
    scope:
      'First complete route in each frame, stopped before optional exploration; independent physical replay. Wall time disabled for deterministic work coverage.',
    fullReplays: rows.length,
    failures,
    fallback: rows.filter((r) => r.basis === 'baseline-fallback').length,
    referenceConnections: rows.reduce((n, r) => n + r.referenceConnections, 0),
    maxOperations: Math.max(0, ...rows.map((r) => r.operations)),
    p50Ms: times[Math.floor(times.length * 0.5)],
    p95Ms: times[Math.floor(times.length * 0.95)],
    rows,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2));
  return report;
}
if (shardIndex === -1) {
  it('independently replays all 8000 seed/frame combinations in eight bounded test processes', async () => {
    mkdirSync(dirname(output), { recursive: true });
    const tasks = Array.from({ length: 8 }, async (_, index) => {
      const path = resolve(`${output}.shard-${index}.json`);
      rmSync(path, { force: true });
      let launchError: unknown;
      try {
        await promisify(execFile)(
          process.execPath,
          [
            'node_modules/vitest/vitest.mjs',
            'run',
            'tests/advanced-roux-corpus.test.ts',
            '--maxWorkers=1',
          ],
          {
            cwd: process.cwd(),
            windowsHide: true,
            maxBuffer: 4 * 1024 * 1024,
            env: {
              ...process.env,
              CUBESTEPS_ADVANCED_ROUX_SHARD: String(index),
              CUBESTEPS_ADVANCED_ROUX_CORPUS: path,
            },
          },
        );
      } catch (error) {
        launchError = error;
        writeFileSync(`${path}.log`, String(error));
      }
      const child = JSON.parse(readFileSync(path, 'utf8'));
      rows.push(...child.rows);
      failures.push(...child.failures);
      console.info(`Advanced Roux shard ${index + 1}/8: ${child.fullReplays}/1000 replays.`);
      if (launchError) throw launchError;
    });
    const settled = await Promise.allSettled(tasks);
    rows.sort((a, b) => a.seed - b.seed || a.frame.localeCompare(b.frame));
    save();
    for (const result of settled) expect(result.status).toBe('fulfilled');
    expect(rows).toHaveLength(8000);
    expect(failures).toEqual([]);
    expect(new Set(rows.map((r) => `${r.seed}/${r.frame}`)).size).toBe(8000);
  }, 3600000);
} else {
  beforeAll(async () => {
    e = await createCubeEngine();
    assets = await loadTestAdvancedRouxAssets();
  });
  for (let batch = shardIndex * 5; batch < shardIndex * 5 + 5; batch++)
    it(`replays seeds ${batch * 25}–${batch * 25 + 24} in all eight frames`, () => {
      for (let seed = batch * 25; seed < batch * 25 + 25; seed++)
        for (const frame of ROUX_FRAMES) {
          const moves = advancedRouxScramble(seed);
          try {
            const result = runAdvancedRouxFixture(e, assets, { kind: 'scramble', moves }, frame.id),
              waste = inspectRouxWaste(e, result.route);
            expect(waste).toEqual({ loops: [], boundaries: [] });
            expect(result.firstOperations).toBeLessThanOrEqual(400000);
            rows.push({
              seed,
              frame: frame.id,
              ms: result.ms,
              operations: result.firstOperations,
              referenceConnections: result.route.trace.stages.filter(
                (_, i) => !!rouxStageConnection(result.route.trace, i),
              ).length,
              turns: result.route.trace.stages.flatMap((s) => s.actions).flatMap((a) => a.moves)
                .length,
              basis: result.route.basis,
            });
          } catch (error) {
            failures.push({
              seed,
              frame: frame.id,
              scramble: moves.join(' '),
              error: String(error),
            });
          }
        }
      save();
      expect(failures.filter((f) => f.seed >= batch * 25 && f.seed < batch * 25 + 25)).toEqual([]);
    }, 600000);
}
afterAll(() => {
  const report = save();
  console.info('ADVANCED_ROUX_CORPUS', JSON.stringify({ ...report, rows: undefined }));
  expect(report.fullReplays).toBe(shardIndex === -1 ? 8000 : 1000);
  expect(report.failures).toEqual([]);
});
