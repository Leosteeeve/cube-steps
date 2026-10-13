import type { TimerSettings } from './types';
export const TIMER_SETTINGS_KEY = 'cubesteps.club.timer-settings.v1';
export const defaultTimerSettings = (): TimerSettings => ({ version: 1, inspectionEnabled: false });
function valid(value: unknown): value is TimerSettings {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as TimerSettings).version === 1 &&
    typeof (value as TimerSettings).inspectionEnabled === 'boolean'
  );
}
export function loadTimerSettings(storage: () => Storage) {
  const fallback = { value: defaultTimerSettings(), available: true, writable: true };
  try {
    const raw = storage().getItem(TIMER_SETTINGS_KEY);
    if (raw === null) return fallback;
    try {
      const parsed: unknown = JSON.parse(raw);
      return valid(parsed) ? { ...fallback, value: parsed } : { ...fallback, writable: false };
    } catch {
      return { ...fallback, writable: false };
    }
  } catch {
    return { ...fallback, available: false };
  }
}
export function saveTimerSettings(storage: () => Storage, settings: TimerSettings): boolean {
  if (!valid(settings) || !loadTimerSettings(storage).writable) return false;
  try {
    storage().setItem(TIMER_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
export function resetTimerSettings(storage: () => Storage): boolean {
  try {
    storage().setItem(TIMER_SETTINGS_KEY, JSON.stringify(defaultTimerSettings()));
    return true;
  } catch {
    return false;
  }
}
