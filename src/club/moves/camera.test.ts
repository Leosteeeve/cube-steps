import { expect, it } from 'vitest';
import { NOTATION_ENTRIES } from './catalog';
import { notationCamera } from './camera';
it('looks at D and B from outside their own faces', () => {
  const d = notationCamera(
    NOTATION_ENTRIES.find((e) => e.base === 'D')!,
    'direction',
  );
  const b = notationCamera(
    NOTATION_ENTRIES.find((e) => e.base === 'B')!,
    'direction',
  );
  expect(d).toEqual({ latitude: -90, longitude: 0, referenceFace: 'D' });
  expect(b).toEqual({ latitude: 0, longitude: 180, referenceFace: 'B' });
});
it('keeps wide and middle layers visible instead of hiding them behind an outer face', () => {
  for (const entry of NOTATION_ENTRIES.filter((e) => e.family !== 'face')) {
    const preset = notationCamera(entry, 'direction');
    expect(Math.abs(preset.latitude)).toBeGreaterThan(0);
    expect(Math.abs(preset.latitude)).toBeLessThan(90);
    expect(Math.abs(preset.longitude) % 90).toBeGreaterThan(0);
    expect(preset.referenceFace).toBe(entry.referenceFace);
  }
});
