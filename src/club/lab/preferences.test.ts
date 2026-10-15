import { expect, it } from 'vitest';
import { readLabPreferences, writeLabPreferences, LAB_PREFERENCES_KEY } from './preferences';
it('defaults to all six and ignores corrupt, empty, duplicate, foreign-version or unsupported colors', () => {
  for (const raw of [
    null,
    'bad',
    '{}',
    JSON.stringify({ allowedColors: [], modelVersion: 'lab-execution-v1' }),
    JSON.stringify({ allowedColors: ['white', 'white'], modelVersion: 'lab-execution-v1' }),
    JSON.stringify({ allowedColors: ['purple'], modelVersion: 'lab-execution-v1' }),
    JSON.stringify({ allowedColors: ['white'], modelVersion: 'old' }),
  ]) {
    expect(readLabPreferences({ getItem: () => raw }).allowedColors).toHaveLength(6);
  }
  expect(
    readLabPreferences({
      getItem: () => {
        throw Error('denied');
      },
    }).allowedColors,
  ).toHaveLength(6);
});
it('writes only valid settings and reports unavailable storage without overwriting other keys', () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const settings = {
    allowedColors: ['white', 'yellow'] as const,
    modelVersion: 'lab-execution-v1' as const,
  };
  expect(writeLabPreferences(storage, settings)).toEqual({ ok: true });
  expect(readLabPreferences(storage)).toEqual(settings);
  expect([...saved.keys()]).toEqual([LAB_PREFERENCES_KEY]);
  expect(writeLabPreferences(storage, { ...settings, allowedColors: [] })).toEqual({ ok: false });
  expect(
    writeLabPreferences(
      {
        setItem: () => {
          throw Error('quota');
        },
      },
      settings,
    ),
  ).toEqual({ ok: false });
});
