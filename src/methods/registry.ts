import type { MethodId } from '../core/types';
import type { MethodPresentation, MethodRuntime } from './contracts';
import { LBL_PRESENTATION } from './lbl/presentation';
import { CFOP_PRESENTATION } from './cfop/presentation';
import { ADVANCED_PRESENTATION } from './advanced/presentation';
const registered = new Map<MethodId, MethodRuntime>();
const presentations = new Map<MethodId, MethodPresentation>();
export function registerMethodPresentation(presentation: MethodPresentation): void {
  const prior = presentations.get(presentation.id);
  if (prior && prior !== presentation)
    throw Error(`Conflicting presentation already registered for ${presentation.id}.`);
  presentations.set(presentation.id, presentation);
}
export function registerMethodRuntime(runtime: MethodRuntime): void {
  const id = runtime.presentation.id,
    old = registered.get(id);
  if (old && old !== runtime) throw Error(`Conflicting runtime already registered for ${id}.`);
  registered.set(id, runtime);
}
export const getRegisteredRuntime = (id: MethodId): MethodRuntime | undefined => registered.get(id);
export function getMethod(id: MethodId): MethodPresentation {
  if (id === 'lbl') return LBL_PRESENTATION;
  if (id === 'cfop-beginner') return CFOP_PRESENTATION;
  if (id === 'cfop-advanced') return ADVANCED_PRESENTATION;
  if (id === 'roux-beginner' && registered.has(id)) return registered.get(id)!.presentation;
  if (presentations.has(id)) return presentations.get(id)!;
  throw new Error(`Method ${id} is not registered.`);
}
