import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { seededScramble } from '../tests/fixtures/lbl-cases.ts';
const port = Number(process.env.CUBESTEPS_BENCH_PORT ?? 5185),
  base = 'http://127.0.0.1:' + port + '/cube-steps/';
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(100);
  }
  if (!ready) throw Error(serverLog || 'Preview server did not start');
  browser = await chromium.launch();
  const instrument = async (context) =>
    context.addInitScript(() => {
      window.__cubeBench = { replies: [], cancellations: [], cancelStart: 0 };
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        started = 0;
        id = undefined;
        completed = false;
        constructor(...args) {
          super(...args);
          this.addEventListener('message', ({ data }) => {
            if (this.id === undefined || data.requestId !== this.id) return;
            this.completed = true;
            window.__cubeBench.replies.push({
              elapsedMs: performance.now() - this.started,
              atMs: performance.now(),
              ok: data.result?.ok === true,
            });
          });
        }
        postMessage(message, ...rest) {
          if (message?.method === 'cfop-advanced') {
            this.started = performance.now();
            this.id = message.requestId;
          }
          return super.postMessage(message, ...rest);
        }
        terminate() {
          if (this.id !== undefined && !this.completed)
            window.__cubeBench.cancellations.push(
              performance.now() - window.__cubeBench.cancelStart,
            );
          return super.terminate();
        }
      };
    });
  async function solve(page, seed) {
    const previous = await page.evaluate(() => window.__cubeBench.replies.length);
    await page.getByLabel('Scramble sequence').fill(seededScramble(seed).join(' '));
    await page.getByRole('button', { name: 'Explain with Advanced CFOP', exact: true }).click();
    await page.waitForFunction((n) => window.__cubeBench.replies.length > n, previous);
    const row = await page.evaluate(() => window.__cubeBench.replies.at(-1));
    if (!row.ok) throw Error('Benchmark solve failed');
    await page.getByRole('button', { name: 'Explain with Advanced CFOP', exact: true }).waitFor();
    return row;
  }
  const cold = [],
    warm = [],
    cancel = [];
  for (let seed = 1; seed <= 20; seed++) {
    const context = await browser.newContext();
    await instrument(context);
    const page = await context.newPage();
    const start = performance.now();
    await page.goto(base + '#/solve/advanced-cfop');
    const result = await solve(page, seed);
    cold.push({
      seed,
      workerMs: result.elapsedMs,
      navigationToReplyMs: result.atMs,
      wallMs: performance.now() - start,
    });
    await context.close();
  }
  console.log('Cold initialization: 20 fresh browser contexts complete.');
  const context = await browser.newContext();
  await instrument(context);
  const page = await context.newPage();
  await page.goto(base + '#/solve/advanced-cfop');
  await solve(page, 1);
  for (let seed = 1; seed <= 50; seed++) warm.push({ seed, ...(await solve(page, seed)) });
  console.log('Warm solves: 50 requests complete.');
  for (let seed = 1; seed <= 20; seed++) {
    await page
      .getByRole('navigation', { name: 'Teaching method' })
      .getByRole('link', { name: 'Advanced CFOP', exact: true })
      .click();
    await page.getByLabel('Scramble sequence').fill(seededScramble(seed).join(' '));
    const count = await page.evaluate(() => window.__cubeBench.cancellations.length);
    const explain = page.getByRole('button', { name: 'Explain with Advanced CFOP', exact: true });
    await expect(explain).toBeEnabled();
    const switchMethod = await page
      .getByRole('navigation', { name: 'Teaching method' })
      .getByRole('link', { name: 'Beginner CFOP', exact: true })
      .elementHandle();
    await explain.evaluate((button, link) => {
      button.click();
      window.__cubeBench.cancelStart = performance.now();
      link.click();
    }, switchMethod);
    await page.waitForFunction((n) => window.__cubeBench.cancellations.length > n, count);
    cancel.push(await page.evaluate(() => window.__cubeBench.cancellations.at(-1)));
  }
  const summarize = (values) => {
    const s = [...values].sort((a, b) => a - b);
    return {
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: s[Math.ceil(s.length * 0.5) - 1],
      p95: s[Math.ceil(s.length * 0.95) - 1],
    };
  };
  const metadata = await (await fetch(base + 'build-info.json')).json();
  const report = {
    build: metadata,
    environment: {
      browser: await browser.version(),
      cpu: cpus()[0].model.trim(),
      platform: platform(),
      release: release(),
      node: process.version,
      device: 'Windows development desktop; no mobile performance inference',
    },
    definitions: {
      cold: 'Fresh Chromium context, navigation performance origin to successful worker reply; includes entering the fixed scramble and clicking Explain.',
      warm: 'Worker postMessage to its successful reply, reusing browser HTTP cache; each request still uses a disposable worker.',
      cancellation: 'Immediate method switch to worker termination.',
    },
    coldNavigationMs: summarize(cold.map((r) => r.navigationToReplyMs)),
    coldWorkerMs: summarize(cold.map((r) => r.workerMs)),
    warmWorkerMs: summarize(warm.map((r) => r.elapsedMs)),
    cancellationMs: summarize(cancel),
    targets: { coldP95Ms: 5000, warmP95Ms: 2000 },
    samples: { cold, warm, cancel },
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/advanced-benchmark.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, samples: undefined }));
  await context.close();
} finally {
  await browser?.close();
  server.kill();
}
