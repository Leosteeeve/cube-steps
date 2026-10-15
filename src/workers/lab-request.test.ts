import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { labContext } from '../../tests/fixtures/lab-context';
import { seededScramble } from '../../tests/fixtures/lbl-cases';
import { handleLabRequest } from './lab-request';
import { loadCrossTable } from '../methods/advanced/cross/load';
import type { LabReply, LabRequest } from './lab-protocol';
let context: ReturnType<typeof labContext>;
beforeAll(async () => {
  context = labContext(await createCubeEngine());
});
const request = (): LabRequest => ({
  kind: 'analyze',
  requestId: 1,
  input: { kind: 'scramble', moves: ['R', 'U'] },
  settings: { allowedColors: ['white'], modelVersion: 'lab-execution-v1' },
  startedAt: 0,
  deadlineAt: 30_000,
});
it('rejects invalid settings/input with structured errors and never silently selects other colors', async () => {
  for (const bad of [
    { ...request(), settings: { allowedColors: [], modelVersion: 'lab-execution-v1' } },
    { ...request(), settings: { allowedColors: ['purple'], modelVersion: 'lab-execution-v1' } },
    {
      ...request(),
      settings: { allowedColors: ['white', 'white'], modelVersion: 'lab-execution-v1' },
    },
    { ...request(), input: { kind: 'scramble', moves: ['M'] } },
  ]) {
    const replies: LabReply[] = [];
    await handleLabRequest(bad, {
      now: () => 0,
      load: async () => context,
      emit: (r) => replies.push(r),
      yieldTask: async () => {},
    });
    expect(replies.at(-1)).toMatchObject({ kind: 'error', code: 'input' });
    expect(replies.some((r) => r.kind === 'candidate')).toBe(false);
  }
});
it('counts initialization toward the absolute deadline and does not load already-expired requests', async () => {
  let loads = 0,
    now = 30_001;
  const replies: LabReply[] = [];
  const load = async () => {
    loads++;
    now = 31_000;
    return context;
  };
  await handleLabRequest(request(), {
    now: () => now,
    load,
    emit: (r) => replies.push(r),
    yieldTask: async () => {},
  });
  expect(loads).toBe(0);
  expect(replies.at(-1)).toMatchObject({ kind: 'done', reason: 'time-limit' });
  now = 0;
  replies.length = 0;
  await handleLabRequest(request(), {
    now: () => now,
    load,
    emit: (r) => replies.push(r),
    yieldTask: async () => {},
  });
  expect(loads).toBe(1);
  expect(replies[0].kind).toBe('initializing');
  expect(replies.at(-1)).toMatchObject({ kind: 'done', reason: 'time-limit' });
});
it('reports an asset failure separately from an illegal cube', async () => {
  const replies: LabReply[] = [];
  await handleLabRequest(request(), {
    now: () => 0,
    load: async () => {
      throw Error('cross-table integrity failure');
    },
    emit: (r) => replies.push(r),
    yieldTask: async () => {},
  });
  expect(replies.at(-1)).toMatchObject({
    kind: 'error',
    code: 'assets',
    message: expect.stringContaining('integrity'),
  });
});
it('rejects missing and corrupted real cross-table responses as asset failures', async () => {
  for (const response of [
    new Response(null, { status: 404 }),
    new Response(new Uint8Array(190080)),
  ]) {
    const replies: LabReply[] = [];
    await handleLabRequest(request(), {
      now: () => 0,
      emit: (r) => replies.push(r),
      load: async () => ({
        ...context,
        table: await loadCrossTable(async () => response),
      }),
    });
    expect(replies.at(-1)).toMatchObject({ kind: 'error', code: 'assets' });
    expect(replies.some((r) => r.kind === 'candidate')).toBe(false);
  }
});
it('streams only validated results and retains actual coverage on cooperative Stop', async () => {
  let cancel = false,
    yields = 0;
  const replies: LabReply[] = [];
  await handleLabRequest(request(), {
    now: () => 0,
    load: async () => context,
    cancelled: () => cancel,
    yieldTask: async () => {
      yields++;
    },
    emit: (r) => {
      replies.push(r);
      if (r.kind === 'candidate') cancel = true;
    },
  });
  expect(replies[0].kind).toBe('initializing');
  expect(replies.some((r) => r.kind === 'candidate')).toBe(true);
  const last = replies.at(-1);
  expect(last).toMatchObject({ kind: 'done', reason: 'cancelled' });
  if (last?.kind === 'done') {
    expect(last.coverage.operations).toBeGreaterThan(0);
    expect(last.coverage.crossCompletions).toBeGreaterThan(0);
  }
  expect(yields).toBeGreaterThan(0);
});
it('can interrupt F2L preparation before its first complete candidate', async () => {
  let batches = 0,
    cancel = false;
  const replies: LabReply[] = [];
  await handleLabRequest(
    { ...request(), input: { kind: 'scramble', moves: seededScramble(1) } },
    {
      now: () => 0,
      load: async () => context,
      cancelled: () => cancel,
      emit: (r) => replies.push(r),
      yieldTask: async () => {
        if (++batches === 40) cancel = true;
      },
    },
  );
  const last = replies.at(-1);
  expect(last).toMatchObject({ kind: 'done', reason: 'cancelled' });
  expect(replies.some((r) => r.kind === 'candidate')).toBe(false);
  if (last?.kind === 'done') {
    expect(last.coverage.crossCompletions).toBe(1);
    expect(last.coverage.f2lCompletions).toBe(0);
  }
});
