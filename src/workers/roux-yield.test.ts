import { afterEach, expect, it, vi } from 'vitest';
import { rouxYieldTask } from './roux-advanced-protocol';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('yields through a browser task without nested-timer clamping and releases both ports', async () => {
  const close1 = vi.fn(),
    close2 = vi.fn();
  let queued: (() => void) | undefined;
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1 = { onmessage: null as null | (() => void), close: close1 };
      port2 = {
        postMessage: () => {
          queued = () => this.port1.onmessage?.();
        },
        close: close2,
      };
    },
  );
  const timer = vi.spyOn(globalThis, 'setTimeout');
  let resumed = false;
  const pending = rouxYieldTask().then(() => {
    resumed = true;
  });
  await Promise.resolve();
  expect(resumed).toBe(false);
  expect(queued).toBeTypeOf('function');
  expect(timer).not.toHaveBeenCalled();
  queued!();
  await pending;
  expect(close1).toHaveBeenCalledOnce();
  expect(close2).toHaveBeenCalledOnce();
});
it('keeps a timer fallback for environments without MessageChannel', async () => {
  vi.stubGlobal('MessageChannel', undefined);
  await expect(rouxYieldTask()).resolves.toBeUndefined();
});
