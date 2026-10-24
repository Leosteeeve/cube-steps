import type { RouxInput, RouxFrameId } from '../../methods/roux-advanced/types';
import { ROUX_FRAMES, selectRouxFrames } from '../../methods/roux-advanced/frames';
import type { RouxCoverage, RouxRoute, RouxSettings } from '../../roux-lab/types';
import type { RouxClientEvent } from '../../roux-lab/client';
import { freezeLabValue } from '../../lab/input';
export interface RouxLabSession {
  input: RouxInput | null;
  settings: RouxSettings;
  coverage: RouxCoverage | null;
  routes: readonly RouxRoute[];
  selectedId: string | null;
  status: 'idle' | 'initializing' | 'searching' | 'complete' | 'stopped' | 'failed';
  error: string;
}
export function initialRouxLabSession(
  frames: readonly RouxFrameId[] = ROUX_FRAMES.map((f) => f.id),
): RouxLabSession {
  return {
    input: null,
    settings: freezeLabValue({
      allowedFrames: selectRouxFrames(frames).map((f) => f.id),
      mode: 'lab',
      modelVersion: 'roux-execution-v1',
    }),
    coverage: null,
    routes: [],
    selectedId: null,
    status: 'idle',
    error: '',
  };
}
export type RouxSessionEvent =
  | RouxClientEvent
  | { type: 'start'; input: RouxInput }
  | { type: 'reset'; frames?: readonly RouxFrameId[] }
  | { type: 'select'; id: string }
  | { type: 'stop' }
  | { type: 'complete'; coverage: RouxCoverage }
  | { type: 'failed'; error: string };
export function reduceRouxLabSession(s: RouxLabSession, event: RouxSessionEvent): RouxLabSession {
  if ('kind' in event) {
    if (!s.input) return s;
    const status = s.status === 'stopped' ? 'stopped' : 'searching';
    if (event.kind === 'progress') return { ...s, coverage: event.coverage, status };
    const route = event.route;
    if (
      route.input.fingerprint !== s.input.fingerprint ||
      !s.settings.allowedFrames.includes(route.frameId)
    )
      return s;
    const existing = s.routes.find((r) => r.id === route.id);
    if (existing && existing.id === s.selectedId) return s;
    const pool = [...s.routes.filter((r) => r.id !== route.id), route].sort(
      (a, b) =>
        (a.score.rated ? a.score.cost : Infinity) - (b.score.rated ? b.score.cost : Infinity) ||
        a.counts.combined - b.counts.combined,
    );
    const selected = s.routes.find((r) => r.id === s.selectedId),
      routes = pool.slice(0, 4);
    if (selected && !routes.some((r) => r.id === selected.id)) {
      routes.pop();
      routes.push(selected);
    }
    return { ...s, routes, selectedId: s.selectedId ?? route.id, status };
  }
  switch (event.type) {
    case 'reset':
      return initialRouxLabSession(event.frames ?? s.settings.allowedFrames);
    case 'start':
      return {
        ...initialRouxLabSession(s.settings.allowedFrames),
        input: event.input,
        status: 'initializing',
      };
    case 'select':
      return s.routes.some((r) => r.id === event.id) ? { ...s, selectedId: event.id } : s;
    case 'stop':
      return { ...s, status: 'stopped' };
    case 'complete':
      return {
        ...s,
        coverage: event.coverage,
        status: s.status === 'stopped' ? 'stopped' : 'complete',
      };
    case 'failed':
      return { ...s, status: 'failed', error: event.error };
  }
}
