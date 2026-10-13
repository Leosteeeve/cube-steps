import { expect, it } from 'vitest';
import {
  NOTATION_ENTRIES,
  describeNotation,
  notationToken,
  type NotationSelection,
} from './catalog';
it('has exactly 18 basic and 36 advanced canonical variants', () => {
  expect(NOTATION_ENTRIES).toHaveLength(18);
  expect(NOTATION_ENTRIES.filter((e) => e.family === 'face')).toHaveLength(6);
  const tokens = NOTATION_ENTRIES.flatMap(({ base }) =>
    (['', "'", '2'] as const).map((amount) => notationToken({ base, amount })),
  );
  expect(new Set(tokens).size).toBe(54);
  expect(notationToken({ base: 'D', amount: "'" })).toBe("D'");
  expect(describeNotation({ base: 'D', amount: "'" }).display).toBe('D′');
  expect(describeNotation({ base: 'D', amount: "'" }).spoken).toContain('prime');
});
it('states the reference side and number of layers without conflating slices and regrips', () => {
  for (const entry of NOTATION_ENTRIES) {
    expect(entry.layers).toHaveLength(
      entry.family === 'wide' ? 2 : entry.family === 'rotation' ? 3 : 1,
    );
    expect(describeNotation({ base: entry.base, amount: '' }).instruction).toContain(
      entry.referenceFace,
    );
  }
  expect(NOTATION_ENTRIES.filter((e) => e.family === 'slice').map((e) => e.referenceFace)).toEqual([
    'L',
    'D',
    'F',
  ]);
  expect(
    NOTATION_ENTRIES.filter((e) => e.family === 'rotation').map((e) => e.referenceFace),
  ).toEqual(['R', 'U', 'F']);
  expect(describeNotation({ base: 'U', amount: '2' }).instruction).toContain('either direction');
});
it('rejects unsupported tokens at the public selection boundary', () => {
  expect(() => notationToken({ base: 'Q', amount: '' } as unknown as NotationSelection)).toThrow();
  expect(() => notationToken({ base: 'U', amount: '3' } as unknown as NotationSelection)).toThrow();
});
