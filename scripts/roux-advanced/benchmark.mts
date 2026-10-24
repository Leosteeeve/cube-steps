import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { cpus, platform, release } from 'node:os';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2),
  arg = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : (args[i + 1] ?? fallback);
  };
const output = resolve(arg('--output', 'test-results/advanced-roux-benchmark.json')),
  labRuns = Number(arg('--lab-runs', '2'));
if (!Number.isInteger(labRuns) || labRuns < 1 || labRuns > 8)
  throw Error('Use 1..8 full Lab runs.');
const server = await createServer({
  server: { host: '127.0.0.1', port: 0, hmr: false },
  logLevel: 'warn',
});
await server.listen();
const address = server.httpServer!.address();
if (!address || typeof address === 'string') throw Error('No local benchmark address.');
const base = `http://127.0.0.1:${address.port}/cube-steps/`,
  browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage(),
  rows: any[] = [],
  errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  // A blank same-origin document excludes unrelated home-page animation from solver timing.
  await page.route('**/roux-benchmark.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><button id="probe">Responsiveness probe</button></body></html>',
    }),
  );
  await page.goto(base + 'roux-benchmark.html');
  const frames = [
    'white-blue',
    'white-green',
    'white-red',
    'white-orange',
    'yellow-blue',
    'yellow-green',
    'yellow-red',
    'yellow-orange',
  ];
  const cases = [
    ...frames.map((frame, i) => ({
      name: i ? 'normal-warm-cache' : 'normal-cold',
      mode: 'normal',
      frames: [frame],
      stop: false,
    })),
    ...Array.from({ length: labRuns }, (_, i) => ({
      name: `lab-full-${i + 1}`,
      mode: 'lab',
      frames,
      stop: false,
    })),
    { name: 'lab-stop-with-pinned-result', mode: 'lab', frames, stop: true },
  ];
  for (const test of cases) {
    const result = await page.evaluate(
      async ({ base, test }) => {
        const startedAtEpochMs = performance.timeOrigin + performance.now(),
          start = performance.now();
        let lastTick = start,
          maxTickGapMs = 0,
          ticks = 0,
          firstMs: number | null = null,
          pinned: any,
          pinnedBefore = '',
          stopAt: number | null = null;
        const ticker = setInterval(() => {
          const t = performance.now();
          maxTickGapMs = Math.max(maxTickGapMs, t - lastTick);
          lastTick = t;
          ticks++;
        }, 16);
        const [{ createCubeEngine }, { createRouxSearchClient }] = await Promise.all([
          import(/* @vite-ignore */ base + 'src/core/cube.ts'),
          import(/* @vite-ignore */ base + 'src/roux-lab/client.ts'),
        ]);
        const engine = await createCubeEngine(),
          client = createRouxSearchClient(engine);
        const request = client.start(
          {
            kind: 'scramble',
            moves: [
              'R',
              'U2',
              "F'",
              'L2',
              'D',
              'B2',
              'R2',
              "U'",
              'F',
              'D2',
              "L'",
              'B',
              'U2',
              "R'",
              'F2',
              'D',
              "B'",
              'L',
              'U',
              'R2',
            ],
          },
          { mode: test.mode, allowedFrames: test.frames, modelVersion: 'roux-execution-v1' },
          (event: any) => {
            if (event.kind === 'candidate' && firstMs === null) {
              firstMs = performance.now() - start;
              pinned = event.route;
              pinnedBefore = JSON.stringify(pinned);
              if (test.stop)
                setTimeout(() => {
                  stopAt = performance.now();
                  request.stop();
                }, 100);
            }
          },
          { startedAtEpochMs },
        );
        const outcome = await request.done,
          done = performance.now();
        clearInterval(ticker);
        client.dispose();
        return {
          firstMs,
          elapsedMs: done - start,
          maxTickGapMs,
          ticks,
          stopLatencyMs: stopAt === null ? null : done - stopAt,
          pinnedUnchanged: !pinned || JSON.stringify(pinned) === pinnedBefore,
          ok: outcome.ok,
          message: outcome.ok ? null : outcome.message,
          coverage: outcome.coverage,
          routes: outcome.ok
            ? outcome.routes.map((r: any) => ({
                id: r.id,
                frame: r.frameId,
                basis: r.basis,
                counts: r.counts,
                score: r.score.rated ? r.score.cost : null,
              }))
            : [],
        };
      },
      { base, test },
    );
    rows.push({ ...test, ...result });
    console.info(JSON.stringify(rows.at(-1)));
  }
} finally {
  const sorted = rows
    .map((r) => r.firstMs)
    .filter((n) => n !== null)
    .sort((a, b) => a - b);
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runtime: {
      node: process.version,
      os: platform(),
      release: release(),
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      browser: browser.version(),
    },
    configuration:
      'Desktop Chromium, local Vite module delivery, real production worker/client protocol and independent validation. Cold includes module/engine/assets; warm repeats in same tab with fresh worker. No CPU throttling. UI integration and physical mobile acceptance are separate.',
    models: { search: 'advanced-roux-v1', execution: 'roux-execution-v1' },
    metrics: {
      p50FirstMs: sorted[Math.floor(sorted.length * 0.5)],
      p95FirstMs: sorted[Math.floor(sorted.length * 0.95)],
      maxMainThreadTickGapMs: Math.max(0, ...rows.map((r) => r.maxTickGapMs)),
    },
    rows,
    errors,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await server.close();
}
if (
  errors.length ||
  rows.some((r) => !r.ok || !r.pinnedUnchanged) ||
  rows.length !== 8 + labRuns + 1
)
  process.exitCode = 1;
