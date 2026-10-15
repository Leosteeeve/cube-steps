import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // A dev-only harness fulfilled by the test; no route or file ships in production.
  await page.route('**/lab-worker-harness', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Lab worker test harness</title>',
    }),
  );
  await page.goto('lab-worker-harness');
});
test('real worker exposes independently verified routes and Stop stays usable within 250ms', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const url = '/cube-steps/src/lab/client.ts';
    const { createLabClient } = await import(/* @vite-ignore */ url);
    const client = createLabClient();
    const first = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('No verified route in 20 seconds')), 20000);
      client.subscribe(() => {
        const s = client.snapshot();
        if (s.routes.length) {
          clearTimeout(timer);
          resolve();
        } else if (s.phase === 'error') {
          clearTimeout(timer);
          reject(Error(s.issue?.message));
        }
      });
    });
    client.analyze(
      { kind: 'scramble', moves: ['R', 'U', 'F2', 'L', 'D2'] },
      { allowedColors: ['white'], modelVersion: 'lab-execution-v1' },
    );
    await first;
    const before = client.snapshot().routes[0].route.id,
      start = performance.now();
    client.stop();
    const elapsed = performance.now() - start,
      phase = client.snapshot().phase;
    await new Promise((resolve) => setTimeout(resolve, 50));
    const after = client.snapshot().routes[0]?.route.id;
    client.dispose();
    return { before, after, elapsed, phase };
  });
  expect(result.after).toBe(result.before);
  expect(result.phase).toBe('stopped');
  expect(result.elapsed).toBeLessThanOrEqual(250);
  test.info().annotations.push({ type: 'stop-latency-ms', description: String(result.elapsed) });
});
test('Stop before first route and a stuck worker recover without exposing late results', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const url = '/cube-steps/src/lab/client.ts';
    const { createLabClient } = await import(/* @vite-ignore */ url);
    const early = createLabClient();
    early.analyze(
      { kind: 'scramble', moves: ['R'] },
      { allowedColors: ['white'], modelVersion: 'lab-execution-v1' },
    );
    early.stop();
    const stopped = early.snapshot();
    early.dispose();
    let watchdog: (() => void) | undefined,
      delay = 0,
      terminated = false;
    const hung = createLabClient({
      factory: () => ({
        onmessage: null,
        onerror: null,
        postMessage() {},
        terminate() {
          terminated = true;
        },
      }),
      prepare: () => new Promise(() => {}),
      setTimer: (fn: () => void, ms: number) => {
        watchdog = fn;
        delay = ms;
        return 1;
      },
      clearTimer: () => {},
    });
    hung.analyze(
      { kind: 'scramble', moves: [] },
      { allowedColors: ['white'], modelVersion: 'lab-execution-v1' },
    );
    watchdog!();
    const timeout = hung.snapshot();
    hung.dispose();
    return {
      early: stopped.phase,
      earlyRoutes: stopped.routes.length,
      delay,
      terminated,
      phase: timeout.phase,
      issue: timeout.issue?.code,
    };
  });
  expect(result).toEqual({
    early: 'stopped',
    earlyRoutes: 0,
    delay: 30400,
    terminated: true,
    phase: 'stopped',
    issue: 'timeout',
  });
});
