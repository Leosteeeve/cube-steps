import type { SolveInput } from '../../core/types';
import {
  createDraftState,
  reduceDraft,
  type DraftAction,
  type DraftState,
} from '../../app/color-entry/draft';
import type { LabSettings, LabCoverage } from '../../lab/types';
import type { LabClientSnapshot } from '../../lab/client';
import type { VerifiedLabRoute } from '../../lab/validate';
import { isLabSettings } from '../../workers/lab-protocol';
import { defaultLabSettings } from './preferences';
export type LabView = 'analyze' | 'compare' | 'trials';
export interface LabSessionState {
  view: LabView;
  draft: { mode: 'scramble' | 'facelets'; text: string; colors: DraftState };
  settings: LabSettings;
  snapshot: LabClientSnapshot;
  input?: SolveInput;
  routes: Readonly<Record<string, VerifiedLabRoute>>;
  pinnedRouteId?: string;
  comparedRouteIds: readonly string[];
  selectedExperimentId?: string;
  invalidated: boolean;
  accepting: boolean;
}
export type LabSessionEvent =
  | { type: 'edit'; text?: string; mode?: 'scramble' | 'facelets' }
  | { type: 'color-draft'; action: DraftAction }
  | { type: 'settings'; settings: LabSettings }
  | { type: 'analyze'; input: SolveInput; requestId: number }
  | { type: 'candidate-update'; snapshot: LabClientSnapshot }
  | { type: 'pin'; routeId: string }
  | { type: 'compare'; routeId: string; selected: boolean }
  | { type: 'tab'; view: LabView }
  | {
      type: 'load-experiment';
      experimentId: string;
      input: SolveInput;
      settings: LabSettings;
      routes: readonly VerifiedLabRoute[];
      coverage?: LabCoverage;
    };
export function createLabSession(settings = defaultLabSettings()): LabSessionState {
  return {
    view: 'analyze',
    draft: { mode: 'scramble', text: '', colors: createDraftState() },
    settings,
    snapshot: { requestId: 0, phase: 'idle', routes: [] },
    routes: {},
    comparedRouteIds: [],
    invalidated: false,
    accepting: false,
  };
}
const clearResults = (state: LabSessionState): LabSessionState => ({
  ...state,
  input: undefined,
  routes: {},
  pinnedRouteId: undefined,
  comparedRouteIds: [],
  selectedExperimentId: undefined,
  invalidated: state.invalidated || state.snapshot.phase !== 'idle',
  accepting: false,
  snapshot: { requestId: state.snapshot.requestId, phase: 'idle', routes: [] },
});
export const canSaveLabSession = (state: LabSessionState) =>
  !!state.input && !!state.pinnedRouteId && !!state.routes[state.pinnedRouteId];
export function reduceLabSession(state: LabSessionState, event: LabSessionEvent): LabSessionState {
  if (event.type === 'tab') return { ...state, view: event.view };
  if (event.type === 'edit') {
    const draft = {
      ...state.draft,
      ...(event.text !== undefined ? { text: event.text } : {}),
      ...(event.mode ? { mode: event.mode } : {}),
    };
    if (draft.text === state.draft.text && draft.mode === state.draft.mode) return state;
    return { ...clearResults(state), draft };
  }
  if (event.type === 'color-draft') {
    const colors = reduceDraft(state.draft.colors, event.action);
    return {
      ...(colors.revision === state.draft.colors.revision ? state : clearResults(state)),
      draft: { ...state.draft, colors },
    };
  }
  if (event.type === 'settings')
    return isLabSettings(event.settings)
      ? { ...clearResults(state), settings: event.settings }
      : state;
  if (event.type === 'analyze')
    return {
      ...clearResults(state),
      input: event.input,
      accepting: true,
      invalidated: false,
      snapshot: { requestId: event.requestId, phase: 'initializing', routes: [] },
    };
  if (event.type === 'candidate-update') {
    if (!state.accepting || event.snapshot.requestId !== state.snapshot.requestId) return state;
    const routes = {
      ...state.routes,
      ...Object.fromEntries(event.snapshot.routes.map((r) => [r.route.id, r])),
    };
    const pinnedRouteId =
      state.pinnedRouteId ??
      event.snapshot.recommendedRouteId ??
      event.snapshot.routes[0]?.route.id;
    const retained = new Set([
      ...event.snapshot.routes.map((r) => r.route.id),
      ...(pinnedRouteId ? [pinnedRouteId] : []),
      ...state.comparedRouteIds,
    ]);
    return {
      ...state,
      snapshot: event.snapshot,
      pinnedRouteId,
      routes: Object.fromEntries(Object.entries(routes).filter(([id]) => retained.has(id))),
    };
  }
  if (event.type === 'pin')
    return state.routes[event.routeId] ? { ...state, pinnedRouteId: event.routeId } : state;
  if (event.type === 'compare') {
    if (!state.routes[event.routeId]) return state;
    const ids = state.comparedRouteIds.filter((id) => id !== event.routeId);
    if (event.selected) {
      if (ids.length >= 4) return state;
      ids.push(event.routeId);
    }
    return { ...state, comparedRouteIds: ids };
  }
  const routes = event.routes.slice(0, 4);
  if (
    !routes.length ||
    routes.some((r) => r.route.inputFingerprint !== routes[0].route.inputFingerprint)
  )
    return state;
  return {
    ...state,
    input: event.input,
    settings: event.settings,
    routes: Object.fromEntries(routes.map((r) => [r.route.id, r])),
    pinnedRouteId: routes[0].route.id,
    comparedRouteIds: [],
    selectedExperimentId: event.experimentId,
    accepting: false,
    invalidated: false,
    snapshot: {
      requestId: state.snapshot.requestId,
      phase: 'stopped',
      inputFingerprint: routes[0].route.inputFingerprint,
      routes,
      coverage: event.coverage,
    },
  };
}
