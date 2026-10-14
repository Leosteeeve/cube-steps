import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  type ReactNode,
  type RefCallback,
} from 'react';
export type GuidanceAction = { name: string; value?: string };
export type GuidanceLease = { restore(): void; dispose(): void };
export type GuidanceBridge = {
  registerTarget(id: string, node: HTMLElement, ready: boolean): () => void;
  emit(action: GuidanceAction): void;
  registerScope(id: string, begin: () => GuidanceLease): () => void;
};
const noop = () => {},
  inactive: GuidanceBridge = { registerTarget: () => noop, emit: noop, registerScope: () => noop };
const Context = createContext(inactive);
export function GuidanceProvider({
  bridge,
  children,
}: {
  bridge: GuidanceBridge;
  children: ReactNode;
}) {
  return <Context.Provider value={bridge}>{children}</Context.Provider>;
}
export function useGuidanceTarget(id: string, ready = true): RefCallback<HTMLElement> {
  const bridge = useContext(Context);
  return useCallback(
    (node) => (node ? bridge.registerTarget(id, node, ready) : undefined),
    [bridge, id, ready],
  );
}
export function useGuidanceAction() {
  return useContext(Context).emit;
}
export function useGuidanceScope(id: string, begin: () => GuidanceLease) {
  const bridge = useContext(Context);
  useLayoutEffect(() => bridge.registerScope(id, begin), [bridge, id, begin]);
}
