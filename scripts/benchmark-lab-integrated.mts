import { chromium, expect, type Page } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { cpus, platform, release } from 'node:os';
import { seededScramble } from '../tests/fixtures/lbl-cases.ts';
import { dismissCaptureWelcome } from './tutorial/capture-fixtures.mts';
export async function runIntegratedBenchmark(args: string[], runs: number, fullRuns: number) {
  const arg = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : (args[i + 1] ?? fallback);
  };
  const output = resolve(arg('--output', 'test-results/lab-integrated-benchmark.json'));
  const build = JSON.parse(await readFile('dist/build-info.json', 'utf8'));
  const port = await new Promise<number>((r) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const p = (server.address() as { port: number }).port;
      server.close(() => r(p));
    });
  });
  const supplied = args.includes('--base-url'),
    base = arg('--base-url', `http://127.0.0.1:${port}/cube-steps/`).replace(/\/?$/, '/');
  const logs: string[] = [],
    child = supplied
      ? undefined
      : spawn(
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
  child?.stdout.on('data', (d) => logs.push(String(d)));
  child?.stderr.on('data', (d) => logs.push(String(d)));
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const rows: any[] = [],
    errors: string[] = [];
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready) throw Error(logs.join('') || 'Preview server did not start.');
    browser = await chromium.launch();
    async function instrument(page: Page, stall = false) {
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(
        ({ stall }) => {
          const win = window as any;
          win.__labMeasure = null;
          win.__labStall = stall;
          const NativeWorker = window.Worker;
          window.Worker = class extends NativeWorker {
            lab: boolean;
            constructor(url: string | URL, options?: WorkerOptions) {
              super(url, options);
              this.lab = /lab[.-]worker/i.test(String(url));
            }
            postMessage(message: any, options?: any) {
              if (this.lab && win.__labStall) return;
              super.postMessage(message, options);
            }
            terminate() {
              if (this.lab && win.__labMeasure) win.__labMeasure.terminatedAt = performance.now();
              super.terminate();
            }
          };
          document.addEventListener(
            'click',
            (e) => {
              const text = (e.target as Element)?.closest('button')?.textContent?.trim();
              if (text === 'Analyze')
                win.__labMeasure = {
                  start: performance.now(),
                  firstMs: null,
                  stopAt: null,
                  terminatedAt: null,
                  finishedMs: null,
                  phase: 'initializing',
                  coverage: null,
                };
              if (text === 'Stop analysis' && win.__labMeasure)
                win.__labMeasure.stopAt = performance.now();
            },
            true,
          );
          const observer = new MutationObserver(() => {
            const m = win.__labMeasure;
            if (!m) return;
            const status = document.querySelector('[data-lab-phase]');
            if (!status) return;
            const phase = status.getAttribute('data-lab-phase');
            m.phase = phase;
            const coverage = status.getAttribute('data-lab-coverage');
            if (coverage) m.coverage = JSON.parse(coverage);
            if (m.firstMs === null && document.querySelector('.lab-candidate'))
              m.firstMs = performance.now() - m.start;
            if (
              !['initializing', 'searching', 'idle'].includes(phase ?? 'idle') &&
              m.finishedMs === null
            )
              m.finishedMs = performance.now() - m.start;
          });
          observer.observe(document, { childList: true, subtree: true, attributes: true });
        },
        { stall },
      );
    }
    async function open(page: Page) {
      const at = performance.now();
      await page.goto(base + 'club/#/lab');
      await dismissCaptureWelcome(page);
      await expect(page.getByLabel('Scramble sequence')).toBeVisible();
      return performance.now() - at;
    }
    async function one(
      page: Page,
      seed: number,
      condition: string,
      uiReadyMs: number,
      full = false,
      stall = false,
    ) {
      await page.getByLabel('Scramble sequence').fill(seededScramble(seed).join(' '));
      await page.getByRole('button', { name: 'Analyze', exact: true }).click();
      if (!stall) {
        await page.waitForFunction(
          () =>
            (window as any).__labMeasure?.firstMs !== null &&
            Number.isFinite((window as any).__labMeasure?.firstMs),
          {},
          { timeout: 31000 },
        );
        if (!full) await page.getByRole('button', { name: 'Stop analysis' }).click();
      }
      await page.waitForFunction(
        () => Number.isFinite((window as any).__labMeasure?.finishedMs),
        {},
        { timeout: 31500 },
      );
      const observation = await page.evaluate(() => {
        const m = (window as any).__labMeasure;
        return {
          ...m,
          memory: (performance as any).memory
            ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                scope: 'Chromium renderer process estimate; not isolated worker heap',
              }
            : null,
        };
      });
      const row = {
        seed,
        condition,
        uiReadyMs,
        firstMs: observation.firstMs,
        endToEndFirstMs: observation.firstMs === null ? null : uiReadyMs + observation.firstMs,
        stopLatencyMs:
          observation.stopAt === null ? null : observation.terminatedAt - observation.stopAt,
        elapsedMs: observation.finishedMs,
        phase: observation.phase,
        coverage: observation.coverage,
        memory: observation.memory,
      };
      if (!stall && row.firstMs === null) throw Error('No independently verified visible route.');
      if (row.stopLatencyMs !== null && (row.stopLatencyMs < 0 || row.stopLatencyMs > 250))
        throw Error(`Stop exceeded target: ${row.stopLatencyMs}`);
      if ((full || stall) && row.elapsedMs > 30500)
        throw Error(`Deadline/watchdog exceeded target: ${row.elapsedMs}`);
      if (
        row.coverage &&
        (row.coverage.operations > 2000000 || row.coverage.entryHighWater > 25000)
      )
        throw Error('Reported work/retained-entry limit exceeded.');
      return row;
    }
    for (let seed = 1; seed <= runs; seed++) {
      const c = await browser.newContext(),
        p = await c.newPage();
      await instrument(p);
      const readyMs = await open(p);
      rows.push(await one(p, seed, 'cold', readyMs));
      await c.close();
      if (seed % 5 === 0) console.log(`Cold integrated: ${seed}/${runs}`);
    }
    const c = await browser.newContext(),
      p = await c.newPage();
    await instrument(p);
    await open(p);
    await one(p, 1, 'warmup', 0);
    for (let seed = 1; seed <= runs; seed++) {
      rows.push(await one(p, seed, 'warm', 0));
      if (seed % 5 === 0) console.log(`Warm integrated: ${seed}/${runs}`);
    }
    for (let seed = 1; seed <= fullRuns; seed++) {
      rows.push(await one(p, seed, 'progressive', 0, true));
      console.log(`Progressive integrated: ${seed}/${fullRuns}`);
    }
    await c.close();
    if (args.includes('--watchdog')) {
      const c = await browser.newContext(),
        p = await c.newPage();
      await instrument(p, true);
      await open(p);
      rows.push(await one(p, 1, 'stalled-worker-watchdog', 0, true, true));
      await c.close();
    }
    if (errors.length) throw Error(errors.join('\n'));
    const summary: Record<string, any> = {};
    for (const condition of new Set(rows.map((r) => r.condition))) {
      summary[condition] = {};
      for (const metric of [
        'uiReadyMs',
        'firstMs',
        'endToEndFirstMs',
        'stopLatencyMs',
        'elapsedMs',
      ]) {
        const v = rows
          .filter((r) => r.condition === condition && typeof r[metric] === 'number')
          .map((r) => r[metric])
          .sort((a, b) => a - b);
        summary[condition][metric] = v.length
          ? {
              n: v.length,
              median: v[Math.ceil(v.length * 0.5) - 1],
              p95: v[Math.ceil(v.length * 0.95) - 1],
              max: v.at(-1),
            }
          : null;
      }
    }
    const report = {
      phase: 'integrated',
      build,
      runs,
      fullRuns,
      recordedAt: new Date().toISOString(),
      configuration:
        'Actual built club Lab UI and production worker; first visible candidate has independent main-thread physical validation. Cold = fresh browser profile, warm = same page/cache; each analysis still creates its own worker. Initial page readiness is recorded separately and in endToEndFirstMs. Stop measures click dispatch to actual worker.terminate, not only UI state.',
      revision: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
        windowsHide: true,
      }).trim(),
      environment: {
        cpu: cpus()[0]?.model,
        platform: platform(),
        release: release(),
        node: process.version,
        browser: browser.version(),
        device: 'Windows desktop; no physical-phone inference',
      },
      summary,
      rows,
      phoneEvidence:
        'Unavailable: no representative physical phone connected. Phone target is unverified; retain Experimental label and use Stop/current route on slower devices.',
      memoryEvidence:
        'Retained-entry high-water counts are enforced; renderer heap API is supplemental, not a worker-specific memory measurement.',
      consoleErrors: errors,
    };
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(summary));
    console.log(`Saved ${output}`);
  } finally {
    await browser?.close();
    child?.kill();
  }
}
