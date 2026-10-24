/** Lightweight route/storage vocabulary: does not load the formula catalog or solver assets. */
export const CMLL_CASE_IDS: readonly string[] = Object.freeze(
  (
    [
      ['o', 2],
      ['h', 4],
      ['pi', 6],
      ['u', 6],
      ['t', 6],
      ['sune', 6],
      ['anti-sune', 6],
      ['l', 6],
    ] as const
  ).flatMap(([family, count]) =>
    Array.from({ length: count }, (_, i) => `cmll-${family}-${i + 1}`),
  ),
);
