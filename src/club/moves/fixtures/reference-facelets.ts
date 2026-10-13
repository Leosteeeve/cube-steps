import type { Color, Face, FaceletSnapshot, TeachingMove } from '../../../core/types';
// Test-only outside-view grids, read row-major. W/Y/G/B/R/O are sticker colors.
// These expectations are independent of cubing.js and CubeEngine.apply.
// E.g. U carries R's top row to F; D carries L's bottom row to F.
// R carries F's right column to U and U's right column to B's left column.
const colors: Record<string, Color> = {
  W: 'white',
  Y: 'yellow',
  G: 'green',
  B: 'blue',
  R: 'red',
  O: 'orange',
};
const solved = {
  U: 'WWWWWWWWW',
  D: 'YYYYYYYYY',
  F: 'GGGGGGGGG',
  B: 'BBBBBBBBB',
  R: 'RRRRRRRRR',
  L: 'OOOOOOOOO',
};
const grids: Partial<Record<TeachingMove, Partial<Record<Face, string>>>> = {
  U: { F: 'RRRGGGGGG', R: 'BBBRRRRRR', B: 'OOOBBBBBB', L: 'GGGOOOOOO' },
  "U'": { F: 'OOOGGGGGG', R: 'GGGRRRRRR', B: 'RRRBBBBBB', L: 'BBBOOOOOO' },
  D: { F: 'GGGGGGOOO', L: 'OOOOOOBBB', B: 'BBBBBBRRR', R: 'RRRRRRGGG' },
  "D'": { F: 'GGGGGGRRR', L: 'OOOOOOGGG', B: 'BBBBBBOOO', R: 'RRRRRRBBB' },
  B: { U: 'RRRWWWWWW', L: 'WOOWOOWOO', D: 'YYYYYYOOO', R: 'RRYRRYRRY' },
  "B'": { U: 'OOOWWWWWW', L: 'YOOYOOYOO', D: 'YYYYYYRRR', R: 'RRWRRWRRW' },
  R: { U: 'WWGWWGWWG', F: 'GGYGGYGGY', D: 'YYBYYBYYB', B: 'WBBWBBWBB' },
  F: { U: 'WWWWWWOOO', R: 'WRRWRRWRR', D: 'RRRYYYYYY', L: 'OOYOOYOOY' },
  M: { U: 'WBWWBWWBW', F: 'GWGGWGGWG', D: 'YGYYGYYGY', B: 'BYBBYBBYB' },
  "M'": { U: 'WGWWGWWGW', F: 'GYGGYGGYG', D: 'YBYYBYYBY', B: 'BWBBWBBWB' },
  E: { F: 'GGGOOOGGG', L: 'OOOBBBOOO', B: 'BBBRRRBBB', R: 'RRRGGGRRR' },
  S: { U: 'WWWOOOWWW', R: 'RWRRWRRWR', D: 'YYYRRRYYY', L: 'OYOOYOOYO' },
  Rw: { U: 'WGGWGGWGG', F: 'GYYGYYGYY', D: 'YBBYBBYBB', B: 'WWBWWBWWB' },
  Uw: { F: 'RRRRRRGGG', R: 'BBBBBBRRR', B: 'OOOOOOBBB', L: 'GGGGGGOOO' },
  Fw: { U: 'WWWOOOOOO', R: 'WWRWWRWWR', D: 'RRRRRRYYY', L: 'OYYOYYOYY' },
  x: { U: 'GGGGGGGGG', F: 'YYYYYYYYY', D: 'BBBBBBBBB', B: 'WWWWWWWWW' },
  y: { F: 'RRRRRRRRR', R: 'BBBBBBBBB', B: 'OOOOOOOOO', L: 'GGGGGGGGG' },
  z: { U: 'OOOOOOOOO', R: 'WWWWWWWWW', D: 'RRRRRRRRR', L: 'YYYYYYYYY' },
};
export const REFERENCE_FACELETS = Object.fromEntries(
  Object.entries(grids).map(([token, value]) => [
    token,
    Object.fromEntries(
      Object.entries({ ...solved, ...value }).map(([face, cells]) => [
        face,
        [...cells].map((color) => colors[color]),
      ]),
    ) as unknown as FaceletSnapshot,
  ]),
) as Partial<Record<TeachingMove, FaceletSnapshot>>;
