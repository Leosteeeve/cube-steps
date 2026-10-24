// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { createRouxTrial, reduceRouxTrial } from './machine';
import type { RouxTrialConditions, RouxTrialEvent, RouxTrialState } from './types';
import { shouldHandleTrialKey } from '../../lab/trials/input';
const conditions: RouxTrialConditions = {
  experimentId: 'e',
  routeId: 'a',
  testerId: 't',
  endpoint: 'roux-blocks',
  method: 'roux-advanced',
  timingMethod: 'keyboard',
  kind: 'measured',
};
const send = (s: RouxTrialState, e: RouxTrialEvent) => reduceRouxTrial(s, e).state;
function confirmed(method: RouxTrialConditions['timingMethod'] = 'keyboard') {
  return send(
    send(createRouxTrial({ ...conditions, timingMethod: method }), {
      type: 'confirm-setup',
      value: true,
    }),
    { type: 'confirm-hold', value: true },
  );
}
function running() {
  const holding = send(confirmed(), { type: 'press', now: 1000 });
  return send(send(holding, { type: 'arm', now: 1300, token: holding.token }), {
    type: 'release',
    now: 1400,
  });
}
it('requires separate confirmations and the exact 300 ms hold, retains Roux identity and ignores repeats', () => {
  const initial = createRouxTrial(conditions);
  expect(initial).toMatchObject({ setupConfirmed: false, holdConfirmed: false });
  expect(send(initial, { type: 'press', now: 0 })).toEqual(initial);
  const pressed = reduceRouxTrial(confirmed(), { type: 'press', now: 1000 });
  expect(pressed.effects).toEqual([{ type: 'quiesce' }]);
  expect(send(pressed.state, { type: 'arm', now: 1299, token: pressed.state.token }).status).toBe(
    'holding',
  );
  expect(send(pressed.state, { type: 'release', now: 1299 }).status).toBe('preparing');
  const s = running();
  expect(s.status).toBe('running');
  expect(send(s, { type: 'press', now: 1800, repeat: true })).toBe(s);
  const review = send(s, { type: 'stop', now: 2500 });
  expect(review).toMatchObject({
    status: 'review',
    draft: { rawMs: 1100, endpoint: 'roux-blocks', method: 'roux-advanced', outcome: null },
  });
  expect(reduceRouxTrial(review, { type: 'press', now: 3000 }).effects).toEqual([]);
  expect(send(review, { type: 'next' })).toMatchObject({
    status: 'preparing',
    setupConfirmed: false,
    holdConfirmed: false,
  });
});
it.each(['blur', 'hidden', 'escape', 'leave', 'pointer-cancel', 'help'] as const)(
  'retains an unclassifiable interrupted draft for %s',
  (reason) => {
    const s = send(running(), { type: 'interrupt', now: 1800, reason });
    expect(s).toMatchObject({
      status: 'review',
      draft: { interruption: reason, outcome: 'interrupted' },
    });
    expect(send(s, { type: 'classify', outcome: 'followed' })).toEqual(s);
  },
);
it('rejects malformed manual input and preserves optional feedback absence', () => {
  for (const text of ['abc', '0', '-1', '1:75', 'Infinity', '1e4'])
    expect(send(confirmed('external-manual'), { type: 'manual', text }).status).toBe('preparing');
  const s = send(confirmed('external-manual'), { type: 'manual', text: '12.34' });
  expect(s).toMatchObject({ status: 'review', draft: { rawMs: 12340 } });
  if (s.status === 'review') expect(s.draft.flow).toBeUndefined();
});
it('leaves editable fields, controls, modifiers and duplicate events alone', () => {
  for (const tag of ['input', 'textarea', 'select', 'button', 'a', 'summary']) {
    const el = document.createElement(tag);
    expect(
      shouldHandleTrialKey(
        {
          code: 'Space',
          repeat: false,
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          shiftKey: false,
          target: el,
        },
        false,
      ),
    ).toBe(false);
  }
  expect(
    shouldHandleTrialKey(
      {
        code: 'Space',
        repeat: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        shiftKey: false,
        target: document.body,
      },
      false,
    ),
  ).toBe(false);
});
