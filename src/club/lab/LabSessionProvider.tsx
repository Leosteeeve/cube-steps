import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CubeEngine, SolveInput } from '../../core/types';
import { parseScramble } from '../../core/notation';
import { validateFacelets, type FaceletValidation } from '../../core/facelets';
import { createLabClient, type LabClient } from '../../lab/client';
import type { LabPlaybackData } from '../../lab/playback';
import type { PlaybackHandle } from '../../player/PlaybackView';
import { createLabSession, reduceLabSession, type LabSessionEvent, type LabView } from './session';
import { readLabPreferences, writeLabPreferences } from './preferences';
const storage = () => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};
function useSession(engine: CubeEngine, view: LabView, factory: () => LabClient) {
  const [client] = useState(factory),
    [state, dispatch] = useReducer(reduceLabSession, undefined, () =>
      createLabSession(readLabPreferences(storage())),
    );
  const handle = useRef<PlaybackHandle | null>(null);
  const timing = useRef(false);
  const [timingLocked, setTimingLockedState] = useState(false);
  const setTimingLocked = useCallback((value: boolean) => {
    timing.current = value;
    setTimingLockedState(value);
  }, []);
  const [inputError, setInputError] = useState(''),
    [validation, setValidation] = useState<FaceletValidation | null>(null),
    [preferencesSaved, setPreferencesSaved] = useState(true),
    [prepared, setPrepared] = useState<LabPlaybackData>(),
    [playbackError, setPlaybackError] = useState('');
  const pinned = state.pinnedRouteId ? state.routes[state.pinnedRouteId] : undefined;
  const registerPlayback = useCallback((next: PlaybackHandle | null) => {
    handle.current = next;
  }, []);
  const quiesce = useCallback(() => {
    client.stop();
    handle.current?.pause();
  }, [client]);
  useEffect(() => {
    const unsubscribe = client.subscribe(() =>
      dispatch({ type: 'candidate-update', snapshot: client.snapshot() }),
    );
    return () => {
      unsubscribe();
      client.dispose();
      handle.current?.pause();
    };
  }, [client]);
  useEffect(() => dispatch({ type: 'tab', view }), [view]);
  useEffect(() => {
    let live = true;
    setPrepared(undefined);
    setPlaybackError('');
    if (pinned)
      void Promise.all([import('../../workers/lab-request'), import('../../lab/playback')])
        .then(async ([{ loadLabContext }, { createLabPlayback }]) => {
          const context = await loadLabContext(),
            r = pinned.route,
            centers = engine.observe(r.initial).centers;
          const result = createLabPlayback(
            context,
            {
              input: r.input,
              initial: r.initial,
              inputHold: { bottom: centers.D, front: centers.F },
              fingerprint: r.inputFingerprint,
            },
            pinned,
          );
          if (live) setPrepared(result);
        })
        .catch((error) => {
          if (live)
            setPlaybackError(
              error instanceof Error ? error.message : 'Unable to prepare playback.',
            );
        });
    return () => {
      live = false;
    };
  }, [pinned, engine]);
  function edit(event: LabSessionEvent) {
    if (timing.current) return;
    const changing =
      event.type === 'edit' ||
      event.type === 'settings' ||
      event.type === 'load-experiment' ||
      (event.type === 'color-draft' &&
        !['select-color', 'select-face'].includes(event.action.type));
    if (changing) quiesce();
    if (event.type === 'settings')
      setPreferencesSaved(writeLabPreferences(storage(), event.settings).ok);
    if (event.type === 'edit' || event.type === 'color-draft') {
      setInputError('');
      setValidation(null);
    }
    dispatch(event);
  }
  function analyze() {
    if (timing.current) return;
    let input: SolveInput;
    if (state.draft.mode === 'scramble') {
      const parsed = parseScramble(state.draft.text);
      if (!parsed.ok) {
        setInputError(`At character ${parsed.offset + 1}: ${parsed.message}`);
        return;
      }
      if (parsed.moves.length > 512) {
        setInputError('Use at most 512 face turns.');
        return;
      }
      input = { kind: 'scramble', moves: parsed.moves };
    } else {
      const checked = validateFacelets(state.draft.colors.draft.facelets, engine.solved());
      setValidation(checked);
      if (!checked.ok) {
        setInputError('Check the highlighted face colors before analyzing.');
        return;
      }
      input = { kind: 'facelets', facelets: checked.facelets };
    }
    quiesce();
    setInputError('');
    dispatch({ type: 'analyze', input, requestId: client.snapshot().requestId + 1 });
    client.analyze(input, state.settings);
  }
  return {
    engine,
    timingLocked,
    setTimingLocked,
    state,
    pinned,
    prepared,
    playbackError,
    inputError,
    validation,
    preferencesSaved,
    edit,
    analyze,
    quiesce,
    registerPlayback,
    stop: () => client.stop(),
    checkColors: () =>
      setValidation(validateFacelets(state.draft.colors.draft.facelets, engine.solved())),
  };
}
type Api = ReturnType<typeof useSession>;
const Context = createContext<Api | null>(null);
export function LabSessionProvider({
  engine,
  view,
  children,
  clientFactory = createLabClient,
}: {
  engine: CubeEngine;
  view: LabView;
  children: ReactNode;
  clientFactory?: () => LabClient;
}) {
  const api = useSession(engine, view, clientFactory);
  return <Context.Provider value={api}>{children}</Context.Provider>;
}
export function useLabSession() {
  const value = useContext(Context);
  if (!value) throw Error('Lab session provider is required.');
  return value;
}
