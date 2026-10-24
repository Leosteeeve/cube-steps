import { expect, it } from 'vitest';
import {
  isRouxRequest,
  isRouxReply,
  isRouxSettings,
  emptyRouxCoverage,
} from './roux-advanced-protocol';
const settings = {
  allowedFrames: ['white-blue'] as const,
  mode: 'normal' as const,
  modelVersion: 'roux-execution-v1' as const,
};
it('admits only bounded club requests, frame sets and epoch timestamps', () => {
  const request = {
    kind: 'analyze',
    requestId: 1,
    edition: 'club',
    input: { kind: 'scramble', moves: ['R'] },
    settings,
    startedAtEpochMs: 1000,
  };
  expect(isRouxRequest(request)).toBe(true);
  expect(isRouxRequest({ ...request, edition: 'global' })).toBe(false);
  expect(isRouxRequest({ ...request, startedAtEpochMs: Infinity })).toBe(false);
  expect(
    isRouxRequest({ ...request, input: { kind: 'scramble', moves: Array(1001).fill('R') } }),
  ).toBe(false);
  expect(isRouxSettings({ ...settings, allowedFrames: ['white-blue', 'white-blue'] })).toBe(false);
  expect(isRouxSettings({ ...settings, allowedFrames: ['red-blue'] })).toBe(false);
  expect(isRouxRequest({ kind: 'cancel', requestId: 1 })).toBe(true);
});
it('bounds unknown reply values and resource claims before independent route replay', () => {
  const coverage = emptyRouxCoverage(settings),
    reply = { requestId: 1, kind: 'progress', coverage };
  expect(isRouxReply(reply)).toBe(true);
  expect(isRouxReply({ ...reply, coverage: { ...coverage, operations: 2000001 } })).toBe(false);
  expect(
    isRouxReply({ ...reply, coverage: { ...coverage, retainedBytes: 129 * 1024 * 1024 } }),
  ).toBe(false);
  expect(
    isRouxReply({ kind: 'done', requestId: 1, outcome: { ok: true, routes: [], coverage } }),
  ).toBe(false);
  expect(isRouxReply({ kind: 'candidate', requestId: 1, route: { kind: 'cfop-lab' } })).toBe(false);
  expect(isRouxReply({ kind: 'error', requestId: 1, message: 'x'.repeat(2001) })).toBe(false);
});
