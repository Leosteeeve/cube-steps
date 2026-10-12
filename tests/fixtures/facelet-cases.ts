import type { Color, Face, FaceMove, FaceletSnapshot } from '../../src/core/types';
// Independent golden grids: geometric sticker rotations, not cubie/codec output.
// Coordinates: +x right, +y up, +z front. Face top vectors F/R/B/L=+y,
// U=-z, D=+z; right vectors F/U/D=+x, R=-z, B=-x, L=+z.
// Each clockwise move rotates its outer layer -90 degrees about the outward normal.
// For example U carries the original red R top row to the F top row.
const names: Record<string, Color> = {
  W: 'white',
  Y: 'yellow',
  G: 'green',
  B: 'blue',
  R: 'red',
  O: 'orange',
};
function colors(rows: Record<Face, string>): FaceletSnapshot {
  return Object.fromEntries(
    Object.entries(rows).map(([face, row]) => [face, [...row].map((c) => names[c])]),
  ) as Record<Face, Color[]>;
}
export const GOLDEN_CASES: readonly {
  name: string;
  moves: readonly FaceMove[];
  facelets: FaceletSnapshot;
}[] = [
  {
    name: 'solved',
    moves: [],
    facelets: colors({
      F: 'GGGGGGGGG',
      R: 'RRRRRRRRR',
      B: 'BBBBBBBBB',
      L: 'OOOOOOOOO',
      U: 'WWWWWWWWW',
      D: 'YYYYYYYYY',
    }),
  },
  {
    name: 'U',
    moves: ['U'],
    facelets: colors({
      F: 'RRRGGGGGG',
      R: 'BBBRRRRRR',
      B: 'OOOBBBBBB',
      L: 'GGGOOOOOO',
      U: 'WWWWWWWWW',
      D: 'YYYYYYYYY',
    }),
  },
  {
    name: 'D',
    moves: ['D'],
    facelets: colors({
      F: 'GGGGGGOOO',
      R: 'RRRRRRGGG',
      B: 'BBBBBBRRR',
      L: 'OOOOOOBBB',
      U: 'WWWWWWWWW',
      D: 'YYYYYYYYY',
    }),
  },
  {
    name: 'F',
    moves: ['F'],
    facelets: colors({
      F: 'GGGGGGGGG',
      R: 'WRRWRRWRR',
      B: 'BBBBBBBBB',
      L: 'OOYOOYOOY',
      U: 'WWWWWWOOO',
      D: 'RRRYYYYYY',
    }),
  },
  {
    name: 'B',
    moves: ['B'],
    facelets: colors({
      F: 'GGGGGGGGG',
      R: 'RRYRRYRRY',
      B: 'BBBBBBBBB',
      L: 'WOOWOOWOO',
      U: 'RRRWWWWWW',
      D: 'YYYYYYOOO',
    }),
  },
  {
    name: 'R',
    moves: ['R'],
    facelets: colors({
      F: 'GGYGGYGGY',
      R: 'RRRRRRRRR',
      B: 'WBBWBBWBB',
      L: 'OOOOOOOOO',
      U: 'WWGWWGWWG',
      D: 'YYBYYBYYB',
    }),
  },
  {
    name: 'L',
    moves: ['L'],
    facelets: colors({
      F: 'WGGWGGWGG',
      R: 'RRRRRRRRR',
      B: 'BBYBBYBBY',
      L: 'OOOOOOOOO',
      U: 'BWWBWWBWW',
      D: 'GYYGYYGYY',
    }),
  },
  {
    name: "R U2 F' L2 B D'",
    moves: ['R', 'U2', "F'", 'L2', 'B', "D'"],
    facelets: colors({
      F: 'BYYBGGYRO',
      R: 'BOBYRYBBW',
      B: 'WWGBBGRRR',
      L: 'WOOWOOYGG',
      U: 'ORRYWWYRR',
      D: 'OBWOYWGGG',
    }),
  },
  {
    name: "F R U' B2 L D2 R'",
    moves: ['F', 'R', "U'", 'B2', 'L', 'D2', "R'"],
    facelets: colors({
      F: 'BOYWGOWWO',
      R: 'OOBGRYGRY',
      B: 'OBGGBYGGY',
      L: 'RRROOBRRO',
      U: 'WYWWWBWWB',
      D: 'GGYBYYBRR',
    }),
  },
];
