import type { LabSettings } from '../../lab/types';
import { LAB_COLORS, isLabSettings } from '../../workers/lab-protocol';
export const LAB_PREFERENCES_KEY = 'cubesteps.club.lab.preferences.v1';
export const defaultLabSettings = (): LabSettings => ({
  allowedColors: [...LAB_COLORS],
  modelVersion: 'lab-execution-v1',
});
export function readLabPreferences(storage: Pick<Storage, 'getItem'> | null): LabSettings {
  try {
    const value = JSON.parse(storage?.getItem(LAB_PREFERENCES_KEY) ?? 'null');
    if (isLabSettings(value))
      return { allowedColors: [...value.allowedColors], modelVersion: value.modelVersion };
  } catch {}
  return defaultLabSettings();
}
export function writeLabPreferences(
  storage: Pick<Storage, 'setItem'> | null,
  settings: LabSettings,
): { ok: boolean } {
  if (!storage || !isLabSettings(settings)) return { ok: false };
  try {
    storage.setItem(LAB_PREFERENCES_KEY, JSON.stringify(settings));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
