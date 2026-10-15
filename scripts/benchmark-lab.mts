import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { cpus, platform, release } from 'node:os';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { seededScramble } from '../tests/fixtures/lbl-cases.ts';

const args = process.argv.slice(2);
function arg(name: string, fallback: string) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : (args[i + 1] ?? fallback);
}
const phase = arg('--phase', 'core'),
  runs = Number(arg('--runs', '40')),
  fullRuns = Number(arg('--full-runs', '0'));
if (
  !['core', 'integrated'].includes(phase) ||
  !Number.isInteger(runs) ||
  runs < 0 ||
  runs > 1000 ||
  !Number.isInteger(fullRuns) ||
  fullRuns < 0 ||
  fullRuns > 40 ||
  runs + fullRuns < 1
)
  throw Error(
    'Use --phase core|integrated, --runs 0..1000 and --full-runs 0..40, with at least one run.',
  );
if (phase === 'integrated')
  throw Error(
    'Integrated measurements require the completed Lab UI in Task 15; no integrated performance result was recorded.',
  );
const output = resolve(arg('--output', 'test-results/lab-core-benchmark.json'));
const temporary = resolve('.temp', `lab-benchmark-${process.pid}`),
  serverLog: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const port = await new Promise<number>((resolvePort) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = (s.address() as { port: number }).port;
    s.close(() => resolvePort(p));
  });
});
const provided = args.includes('--base-url'),
  base = arg('--base-url', `http://127.0.0.1:${port}/cube-steps/`).replace(/\/?$/, '/');
const workerSource = String.raw`
let cancelled=false, loaded;
self.onmessage=async({data})=>{
 if(data.type==='stop'){cancelled=true;return;}
 if(data.type!=='analyze')return;
 cancelled=false;
 const start=data.startedEpoch-performance.timeOrigin;
 let maxBatchMs=0,maxBatchOperations=0,first=null,lastCoverage=null,budget;
 try {
  loaded??=Promise.all([import('../../src/core/cube.ts'),import('../../src/methods/advanced/cross/load.ts'),import('../../src/lab/execution/profiles.ts'),import('../../src/lab/input.ts'),import('../../src/lab/budget.ts'),import('../../src/lab/search.ts')])
   .then(async([cube,table,profiles,input,budget,search])=>({engine:await cube.createCubeEngine(),table:await table.loadCrossTable(fetch),profiles:profiles.EXECUTION_CATALOG,input,budget,search}));
  const modules=await loaded;
  budget=modules.budget.createLabBudget({startedAt:start,cancelled:()=>cancelled});
  const run=function*(){
   const input=yield* modules.input.prepareLabInputSteps(modules.engine,{kind:'scramble',moves:data.moves},budget);
   yield* modules.search.searchLab(modules,input,{allowedColors:modules.search.LAB_COLOR_ORDER,modelVersion:'lab-execution-v1'},budget);
  }();
  let finished=false;
  while(!finished){
   const batchStart=performance.now(),ops=budget.snapshot().operations;
   do {
    const next=run.next();if(next.done){finished=true;break;}
    const event=next.value;
    if(event.kind==='candidate'&&first===null){first=performance.now()-start;postMessage({type:'first',requestId:data.requestId,elapsedMs:first,bottom:event.route.startHold.bottom,score:event.route.score});}
    if(event.kind==='progress'||event.kind==='done')lastCoverage=event.coverage;
   } while(performance.now()-batchStart<4&&budget.snapshot().operations-ops<128);
   maxBatchMs=Math.max(maxBatchMs,performance.now()-batchStart);maxBatchOperations=Math.max(maxBatchOperations,budget.snapshot().operations-ops);
   if(!finished)await new Promise(r=>setTimeout(r,0));
  }
  postMessage({type:'done',requestId:data.requestId,firstMs:first,elapsedMs:performance.now()-start,maxBatchMs,maxBatchOperations,coverage:lastCoverage,budget:budget.snapshot(),memory:self.performance.memory?{usedJSHeapSize:self.performance.memory.usedJSHeapSize,scope:'worker exposed performance.memory'}:null});
 } catch(error){postMessage({type:'error',requestId:data.requestId,message:String(error),firstMs:first,coverage:lastCoverage});}
};
`;
await mkdir(temporary, { recursive: true });
await writeFile(resolve(temporary, 'worker.ts'), workerSource);
await writeFile(
  resolve(temporary, 'index.html'),
  '<!doctype html><html lang="en"><title>Local CFOP Lab core benchmark</title><body>Local benchmark harness; not a published route.</body></html>',
);
const child = provided
  ? undefined
  : spawn(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort',
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
child?.stdout.on('data', (d) => serverLog.push(String(d)));
child?.stderr.on('data', (d) => serverLog.push(String(d)));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const rows: Record<string, unknown>[] = [],
  report = {
    phase,
    runs,
    fullRuns,
    configuration:
      'Temporary Vite development worker harness; first result includes lazy imports, engine/table initialization and worker validation; excludes UI and independent main-thread validation.',
    batching: {
      targetMs: 4,
      targetOperations: 128,
      ceilings: { ms: 8, operations: 256 },
      note: 'Headroom for one bounded generator step; observed maxima are reported, not assumed.',
    },
    sourceHashes: Object.fromEntries(
      await Promise.all(
        [
          'src/lab/execution/score.ts',
          'src/lab/f2l/candidates.ts',
          'src/lab/f2l/planner.ts',
          'scripts/benchmark-lab.mts',
        ].map(async (path) => [
          path,
          createHash('sha256')
            .update(await readFile(path))
            .digest('hex'),
        ]),
      ),
    ),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      windowsHide: true,
    }).trim(),
    dirty:
      execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', windowsHide: true }).trim()
        .length > 0,
    environment: {
      cpu: cpus()[0]?.model,
      platform: platform(),
      release: release(),
      node: process.version,
      browser: '',
      device: 'Windows development desktop; no physical-phone inference',
    },
    rows,
  };
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
  if (!ready) throw Error(serverLog.join('') || 'Local benchmark server not ready.');
  browser = await chromium.launch();
  report.environment.browser = browser.version();
  const harness = base + `.temp/lab-benchmark-${process.pid}/index.html`;
  async function one(
    page: import('@playwright/test').Page,
    seed: number,
    warm: boolean,
    stopOnFirst = true,
  ) {
    return await page.evaluate(
      async ({ moves, seed, warm, stopOnFirst }) => {
        const startedEpoch = performance.timeOrigin + performance.now();
        const host = window as unknown as { worker?: Worker; sequence?: number };
        if (!warm || !host.worker) {
          host.worker?.terminate();
          host.worker = new Worker(new URL('./worker.ts', location.href), { type: 'module' });
        }
        const worker = host.worker,
          requestId = (host.sequence ?? 0) + 1;
        host.sequence = requestId;
        return await new Promise<Record<string, unknown>>((resolveResult, reject) => {
          let firstAt = 0,
            stopAt = 0;
          const timeout = setTimeout(() => {
            worker.terminate();
            reject(Error('Core benchmark watchdog exceeded 30.5 seconds'));
          }, 30_500);
          const listener = ({ data }: MessageEvent) => {
            if (data.requestId !== requestId) return;
            if (data.type === 'first') {
              firstAt = performance.now();
              if (stopOnFirst) {
                stopAt = firstAt;
                worker.postMessage({ type: 'stop' });
              }
            }
            if (data.type === 'error') {
              clearTimeout(timeout);
              worker.removeEventListener('message', listener);
              reject(Error(data.message));
            }
            if (data.type === 'done') {
              clearTimeout(timeout);
              worker.removeEventListener('message', listener);
              if (data.firstMs === null) {
                reject(Error('No verified initial candidate: ' + JSON.stringify(data)));
                return;
              }
              resolveResult({
                ...data,
                seed,
                condition: stopOnFirst ? (warm ? 'warm' : 'cold') : 'progressive',
                firstObservedMs: firstAt ? firstAt - (startedEpoch - performance.timeOrigin) : null,
                stopLatencyMs: stopAt ? performance.now() - stopAt : null,
              });
            }
          };
          worker.addEventListener('message', listener);
          worker.postMessage({ type: 'analyze', requestId, moves, startedEpoch });
        });
      },
      { moves: seededScramble(seed), seed, warm, stopOnFirst },
    );
  }
  for (let seed = 1; seed <= runs; seed++) {
    const context = await browser.newContext(),
      page = await context.newPage();
    await page.goto(harness);
    rows.push(await one(page, seed, false));
    await context.close();
    if (seed % 10 === 0) console.log(`Cold core measurements: ${seed}/${runs}`);
  }
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto(harness);
  await one(page, 1, false);
  for (let seed = 1; seed <= runs; seed++) {
    rows.push(await one(page, seed, true));
    if (seed % 10 === 0) console.log(`Warm core measurements: ${seed}/${runs}`);
  }
  for (let seed = 1; seed <= fullRuns; seed++) {
    rows.push(await one(page, seed, true, false));
    console.log(`Full progressive measurements: ${seed}/${fullRuns}`);
  }
  await context.close();
  const summarize = (values: number[]) => {
    const s = [...values].sort((a, b) => a - b);
    return {
      median: s[Math.ceil(s.length * 0.5) - 1],
      p95: s[Math.ceil(s.length * 0.95) - 1],
      max: s.at(-1),
    };
  };
  const summary = Object.fromEntries(
    ['cold', 'warm', 'progressive']
      .filter((condition) => rows.some((r) => r.condition === condition))
      .map((condition) => [
        condition,
        Object.fromEntries(
          [
            'firstMs',
            'firstObservedMs',
            'stopLatencyMs',
            'maxBatchMs',
            'maxBatchOperations',
            'elapsedMs',
          ].map((metric) => [
            metric,
            summarize(
              rows
                .filter((r) => r.condition === condition && typeof r[metric] === 'number')
                .map((r) => r[metric] as number),
            ),
          ]),
        ),
      ]),
  );
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      {
        ...report,
        summary,
        phoneEvidence: 'Unavailable: no representative physical phone connected.',
        memoryEvidence: rows.some((r) => r.memory)
          ? 'See row-level API scope.'
          : 'Worker memory API unavailable; frontier high-water counts are reported separately.',
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary));
  console.log(`Saved ${output}`);
} finally {
  await browser?.close();
  child?.kill();
  // Only this process-created directory under the repository .temp is removed.
  if (dirname(temporary) === resolve('.temp') && temporary.endsWith(`lab-benchmark-${process.pid}`))
    await rm(temporary, { recursive: true, force: true });
}
