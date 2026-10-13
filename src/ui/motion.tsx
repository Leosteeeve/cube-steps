import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Edition } from '../app/edition';
import './motion.css';
type Preference = 'system' | 'off';
const keyFor = (edition: Edition) =>
  edition === 'club' ? 'cubesteps.club.motion.v1' : 'cubesteps.motion.v1';
function load(key: string): { preference: Preference; available: boolean; protected: boolean } {
  try {
    const text = localStorage.getItem(key);
    if (text === null) return { preference: 'system', available: true, protected: false };
    try {
      const raw = JSON.parse(text);
      if (raw?.version === 1 && ['system', 'off'].includes(raw.preference))
        return { preference: raw.preference, available: true, protected: false };
    } catch {
      /* Preserve unsupported bytes. */
    }
    return { preference: 'system', available: false, protected: true };
  } catch {
    return { preference: 'system', available: false, protected: false };
  }
}
interface Motion {
  enabled: boolean;
  preference: Preference;
  storageAvailable: boolean;
  setPreference(value: Preference): void;
  resetPreference(): void;
}
const Context = createContext<Motion>({
  enabled: false,
  preference: 'system',
  storageAvailable: false,
  setPreference() {},
  resetPreference() {},
});
export function MotionProvider({ edition, children }: { edition: Edition; children: ReactNode }) {
  const key = keyFor(edition),
    [stored, setStored] = useState(() => load(key));
  const [systemReduced, setSystemReduced] = useState(
    () =>
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const media =
      typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const change = () => setSystemReduced(media?.matches ?? false),
      visibility = () => setHidden(document.hidden);
    media?.addEventListener('change', change);
    document.addEventListener('visibilitychange', visibility);
    // Cover a preference/visibility change between render and subscription.
    change();
    visibility();
    return () => {
      media?.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const enabled = !systemReduced && stored.preference !== 'off' && !hidden;
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? 'full' : 'reduced';
  }, [enabled]);
  function save(preference: Preference, reset = false) {
    let available = false;
    const protectedData = stored.protected && !reset;
    if (!protectedData)
      try {
        localStorage.setItem(key, JSON.stringify({ version: 1, preference }));
        available = true;
      } catch {
        /* Session preference remains usable. */
      }
    setStored({ preference, available, protected: protectedData });
  }
  return (
    <Context.Provider
      value={{
        enabled,
        preference: stored.preference,
        storageAvailable: stored.available,
        setPreference: (preference) => save(preference),
        resetPreference: () => save('system', true),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useMotion = () => useContext(Context);
export function MotionPreference() {
  const motion = useMotion();
  return (
    <div className="motion-preference">
      <label>
        Decorative motion{' '}
        <select
          value={motion.preference}
          onChange={(e) => motion.setPreference(e.target.value as Preference)}
        >
          <option value="system">Follow device setting</option>
          <option value="off">Off</option>
        </select>
      </label>
      {!motion.storageAvailable && (
        <span>
          Motion preference is not saved.{' '}
          <button onClick={motion.resetPreference}>Reset motion preference</button>
        </span>
      )}
    </div>
  );
}
