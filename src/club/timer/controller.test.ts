import { beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { createTimerController } from './controller';
import type { TimerRepository } from './repository';
import type { TimerAttempt } from './types';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
function fixture(generate = vi.fn(async () => "R U R'")) {
  let now = 0;
  const record = vi.fn(async (_attempt: TimerAttempt) => {}),
    repository = { record } as unknown as TimerRepository;
  const c = createTimerController({
    engine,
    repository,
    settings: { version: 1, inspectionEnabled: false },
    generate,
    clock: { now: () => now, iso: () => '2026-10-13T00:00:00.000Z' },
  });
  return {
    c,
    record,
    generate,
    at(t: number) {
      now = t;
    },
  };
}
it('freezes a prepared attempt, records at stop and consumes release before generating', async () => {
  const f = fixture();
  await f.c.newScramble();
  const initial = f.c.snapshot();
  expect(initial.phase).toBe('idle');
  f.c.dispatch({ type: 'down', token: 'keyboard' });
  f.at(300);
  f.c.dispatch({ type: 'up', token: 'keyboard' });
  await f.c.newScramble();
  expect(f.generate).toHaveBeenCalledTimes(1);
  f.at(2300);
  f.c.dispatch({ type: 'down', token: 'keyboard' });
  expect(f.record).toHaveBeenCalledTimes(1);
  expect(f.record.mock.calls[0][0]).toMatchObject({ rawMs: 2000, scramble: "R U R'" });
  expect(f.generate).toHaveBeenCalledTimes(1);
  f.c.dispatch({ type: 'up', token: 'keyboard' });
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(2));
  f.c.dispose();
});
it('discards obsolete promises and late completions after disposal', async () => {
  const responses: ((s: string) => void)[] = [];
  const generate = vi.fn(() => new Promise<string>((resolve) => responses.push(resolve)));
  const f = fixture(generate);
  const a = f.c.newScramble(),
    b = f.c.newScramble();
  responses[1]('U2 F');
  await b;
  expect(f.c.snapshot()).toMatchObject({ prepared: { text: 'U2 F' } });
  responses[0]('R');
  await a;
  expect(f.c.snapshot()).toMatchObject({ prepared: { text: 'U2 F' } });
  const pending = f.c.newScramble();
  f.c.dispose();
  responses[2]('B2');
  await pending;
  expect(f.record).not.toHaveBeenCalled();
  expect(f.c.snapshot().phase).toBe('loading');
});
it('reports invalid generator output, retries and retains a completed result on failure', async () => {
  const f = fixture(
    vi
      .fn()
      .mockResolvedValueOnce('bad')
      .mockResolvedValueOnce('R U')
      .mockRejectedValueOnce(new Error('network')),
  );
  await f.c.newScramble();
  expect(f.c.snapshot().phase).toBe('error');
  await f.c.newScramble();
  f.c.dispatch({ type: 'down', token: 'keyboard' });
  f.at(300);
  f.c.dispatch({ type: 'up', token: 'keyboard' });
  f.at(1300);
  f.c.dispatch({ type: 'down', token: 'keyboard' });
  f.c.dispatch({ type: 'up', token: 'keyboard' });
  await vi.waitFor(() =>
    expect(f.c.snapshot()).toMatchObject({ phase: 'error', lastAttempt: { rawMs: 1000 } }),
  );
  f.c.dispose();
});
it('disposal records an interrupted run once and prevents another generation', async () => {
  const f = fixture();
  await f.c.newScramble();
  f.c.dispatch({ type: 'down', token: 'keyboard' });
  f.at(300);
  f.c.dispatch({ type: 'up', token: 'keyboard' });
  f.at(2000);
  f.c.dispose();
  f.c.dispose();
  expect(f.record).toHaveBeenCalledTimes(1);
  expect(f.record.mock.calls[0][0]).toMatchObject({ interruption: 'leave', rawMs: 1700 });
  expect(f.generate).toHaveBeenCalledTimes(1);
});
