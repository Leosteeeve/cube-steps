import { expect, it } from 'vitest';
import { createTrial, reduceTrial } from './machine';
import type { TrialConditions, TrialEvent, TrialState } from './types';
const conditions: TrialConditions = {
  experimentId: 'experiment',
  routeId: 'route',
  testerId: 'tester',
  kind: 'measured',
  timingMethod: 'keyboard',
  endpoint: 'cross-f2l',
};
const send = (s: TrialState, e: TrialEvent) => reduceTrial(s, e).state;
const confirmed = (method: TrialConditions['timingMethod'] = 'keyboard') =>
  send(
    send(createTrial({ ...conditions, timingMethod: method }), {
      type: 'confirm-setup',
      value: true,
    }),
    { type: 'confirm-hold', value: true },
  );
function running(method: TrialConditions['timingMethod'] = 'keyboard') {
  let s = send(confirmed(method), { type: 'press', now: 1000 });
  s = send(s, { type: 'arm', now: 1300, token: s.token });
  return send(s, { type: 'release', now: 1400 });
}
it('requires two unchecked confirmations, ignores repeats and early releases', () => {
  const initial = createTrial(conditions);
  expect(initial.setupConfirmed).toBe(false);
  expect(initial.holdConfirmed).toBe(false);
  expect(send(initial, { type: 'press', now: 0 }).status).toBe('preparing');
  const one = send(initial, { type: 'confirm-setup', value: true });
  expect(send(one, { type: 'press', now: 0 }).status).toBe('preparing');
  const ready = confirmed();
  expect(send(ready, { type: 'press', now: 0, repeat: true }).status).toBe('preparing');
  const holding = send(ready, { type: 'press', now: 0 });
  expect(send(holding, { type: 'release', now: 299 }).status).toBe('preparing');
  expect(send(holding, { type: 'arm', now: 299, token: holding.token }).status).toBe('holding');
});
it.each(['keyboard', 'touch'] as const)(
  'uses hold/release, monotonic time and one unclassified draft for %s',
  (method) => {
    const prep = confirmed(method),
      pressed = reduceTrial(prep, { type: 'press', now: 1000 });
    expect(pressed.effects).toEqual([{ type: 'quiesce' }]);
    const s = running(method);
    expect(s.status).toBe('running');
    expect(send(s, { type: 'press', now: 2000, repeat: true })).toEqual(s);
    const stopped = reduceTrial(s, { type: 'press', now: 1400 + 12345.67 });
    expect(stopped.state.status).toBe('review');
    if (stopped.state.status !== 'review') throw Error('No review');
    expect(stopped.state.draft.rawMs).toBeCloseTo(12345.67);
    expect(stopped.state.draft.outcome).toBeNull();
    expect(stopped.effects.filter((e) => e.type === 'draft')).toHaveLength(1);
    expect(reduceTrial(stopped.state, { type: 'press', now: 20000 }).effects).toEqual([]);
    const next = send(stopped.state, { type: 'next' });
    expect(next).toMatchObject({
      status: 'preparing',
      setupConfirmed: false,
      holdConfirmed: false,
    });
  },
);
it.each(['blur', 'hidden', 'escape', 'leave', 'pointer-cancel', 'help'] as const)(
  '%s interrupts armed/running attempts and never creates a followed result',
  (reason) => {
    for (const start of [send(confirmed(), { type: 'press', now: 1000 }), running()]) {
      const stop = send(start, { type: 'interrupt', now: 1600, reason });
      expect(stop.status).toBe('review');
      if (stop.status !== 'review') throw Error('Missing draft');
      expect(stop.draft.outcome).toBe('interrupted');
      expect(send(stop, { type: 'classify', outcome: 'followed' })).toEqual(stop);
      const next = send(stop, { type: 'next' });
      expect(send(next, { type: 'arm', now: 2000, token: start.token }).status).toBe('preparing');
    }
  },
);
it('locks input, ignores backward/non-finite timestamps and keeps manual timing separate', () => {
  const s = send(confirmed(), { type: 'lock', locked: true, now: 0 });
  expect(send(s, { type: 'press', now: 0 }).status).toBe('preparing');
  expect(send(running(), { type: 'stop', now: 1300 }).status).toBe('running');
  expect(send(running(), { type: 'stop', now: NaN }).status).toBe('running');
  expect(send(confirmed(), { type: 'manual', text: '12.4' }).status).toBe('preparing');
  const manual = send(confirmed('external-manual'), { type: 'manual', text: '1:02.500' });
  expect(manual.status).toBe('review');
  if (manual.status === 'review')
    expect(manual.draft).toMatchObject({
      rawMs: 62500,
      outcome: null,
      timingMethod: 'external-manual',
    });
  expect(send(confirmed('external-manual'), { type: 'manual', text: 'NaN' }).status).toBe(
    'preparing',
  );
});
it('allows an untimed warmup but never an untimed measured followed attempt', () => {
  const s = createTrial({ ...conditions, kind: 'warmup', timingMethod: 'external-manual' });
  expect(send(s, { type: 'manual', text: '' }).status).toBe('review');
  expect(send(confirmed('external-manual'), { type: 'manual', text: '' }).status).toBe('preparing');
});
it('cannot silently replace an active attempt with new conditions', () => {
  const s = running();
  expect(send(s, { type: 'next', conditions: { ...conditions, routeId: 'other' } })).toEqual(s);
});
