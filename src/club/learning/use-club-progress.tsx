import { createContext, useContext, useState, type ReactNode } from 'react';
import { createClubProgressStore, validLesson } from './progress-store';
import { CLUB_METHODS, type ClubProgress } from './types';
import type { MethodId } from '../../core/types';
function useProgressState() {
  const [store] = useState(() => createClubProgressStore(() => localStorage));
  const [snapshot, setSnapshot] = useState(() => store.load());
  function update(change: (p: ClubProgress) => ClubProgress) {
    store.save(change(store.load().value));
    setSnapshot(store.load());
  }
  return {
    progress: snapshot.value,
    available: snapshot.available,
    writable: snapshot.writable,
    chooseMethod(method: MethodId) {
      if (CLUB_METHODS.includes(method)) update((p) => ({ ...p, selectedMethod: method }));
    },
    visitLesson(method: MethodId, lessonId: string) {
      if (validLesson(method, lessonId))
        update((p) => ({ ...p, selectedMethod: method, lastLesson: { method, lessonId } }));
    },
    setPracticed(method: MethodId, lessonId: string, value: boolean) {
      if (validLesson(method, lessonId))
        update((p) => ({
          ...p,
          practiced: {
            ...p.practiced,
            [method]: value
              ? [...new Set([...(p.practiced[method] ?? []), lessonId])]
              : (p.practiced[method] ?? []).filter((id) => id !== lessonId),
          },
        }));
    },
    reset() {
      store.reset();
      setSnapshot(store.load());
    },
  };
}
const Context = createContext<ReturnType<typeof useProgressState> | null>(null);
export function ClubProgressProvider({ children }: { children: ReactNode }) {
  const state = useProgressState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useClubProgress() {
  const value = useContext(Context);
  if (!value) throw Error('Club progress provider missing');
  return value;
}
export function ProgressStatus() {
  const { available, writable, reset } = useClubProgress();
  return (
    <div className="club-save-status">
      <span>
        {!writable
          ? 'Saved learning data could not be read. Changes stay in this page until you reset it.'
          : !available
            ? 'Learning progress is not saved. It stays in this page only.'
            : 'Learning progress stays in this browser.'}
      </span>
      {!writable && <button onClick={reset}>Reset learning data</button>}
    </div>
  );
}
