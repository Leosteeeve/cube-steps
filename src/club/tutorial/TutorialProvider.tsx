import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { GuidanceProvider } from '../../ui/guidance';
import { createTutorialRuntime, type TutorialRuntime } from './runtime';
import { TourOverlay } from './TourOverlay';
import type { TourId } from './types';
import './tutorial.css';
type Api = ReturnType<typeof useApi>;
const Context = createContext<Api | null>(null);
function useApi(runtime: TutorialRuntime) {
  const state = useSyncExternalStore(runtime.subscribe, runtime.snapshot);
  return {
    ...state,
    runtime,
    overlayOpen: !!(state.run || state.welcome),
    requestStart: runtime.requestStart,
    openTour: runtime.openTour,
    dismissInvitation: runtime.dismissInvitation,
    resetPreferences: runtime.resetPreferences,
    exit: runtime.exit,
    registerGuard: runtime.registerGuard,
    registerInputLock: runtime.registerInputLock,
  };
}
export function useClubTutorial() {
  const value = useContext(Context);
  if (!value) throw Error('Club tutorial provider is required');
  return value;
}
export function useOptionalClubTutorial() {
  return useContext(Context);
}
export function TutorialProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(() => createTutorialRuntime(() => localStorage)),
    api = useApi(runtime);
  useEffect(() => {
    const interact = () => runtime.interact();
    document.addEventListener('pointerdown', interact, true);
    document.addEventListener('keydown', interact, true);
    return () => {
      document.removeEventListener('pointerdown', interact, true);
      document.removeEventListener('keydown', interact, true);
      runtime.dispose();
    };
  }, [runtime]);
  useEffect(() => {
    const timer = setTimeout(runtime.offer, 250);
    return () => clearTimeout(timer);
  }, [runtime, api.revision]);
  return (
    <Context.Provider value={api}>
      <GuidanceProvider bridge={runtime.bridge}>
        {children}
        <TourOverlay runtime={runtime} />
      </GuidanceProvider>
    </Context.Provider>
  );
}
export function TutorialRouteBoundary({
  routeKey,
  tourId,
  children,
}: {
  routeKey: string;
  tourId: TourId | null;
  children: ReactNode;
}) {
  const api = useOptionalClubTutorial(),
    runtime = api?.runtime;
  useLayoutEffect(() => {
    runtime?.setRoute(routeKey, tourId);
  }, [runtime, routeKey, tourId]);
  return children;
}
