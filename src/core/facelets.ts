import type { Color, CubeState, Face, FaceletRef, FaceletSnapshot } from './types';
import { COLORS, CENTER_SLOTS, CORNER_SLOTS, EDGE_SLOTS } from './observations';
import { FACE_ENTRY_ORDER, FACELET_LAYOUT, FACE_NAMES } from './facelet-layout';
import { copyCubeState } from './state';
export type FaceletIssueCode =
  | 'shape'
  | 'unknown-color'
  | 'center'
  | 'unfilled'
  | 'color-count'
  | 'piece-colors'
  | 'duplicate-piece'
  | 'mirrored-corner'
  | 'edge-orientation'
  | 'corner-orientation'
  | 'permutation-parity';
export interface FaceletIssue {
  code: FaceletIssueCode;
  message: string;
  cells: FaceletRef[];
}
export type FaceletValidation =
  { ok: true; state: CubeState; facelets: FaceletSnapshot } | { ok: false; issues: FaceletIssue[] };
const colorNames = Object.values(COLORS);
function freezeFacelets(value: Record<Face, Color[]>): FaceletSnapshot {
  for (const face of FACE_ENTRY_ORDER) Object.freeze(value[face]);
  return Object.freeze(value);
}
export function stateToFacelets(state: CubeState): FaceletSnapshot {
  const value = Object.fromEntries(
    FACE_ENTRY_ORDER.map((face) => [
      face,
      FACELET_LAYOUT[face].map((position) => {
        const { orbit, slot, sticker } = position;
        const piece = state.data[orbit].pieces[slot];
        if (orbit === 'CENTERS') return COLORS[CENTER_SLOTS[piece]];
        const names = orbit === 'EDGES' ? EDGE_SLOTS : CORNER_SLOTS;
        const original = names[piece];
        return COLORS[
          original[(sticker + state.data[orbit].orientation[slot]) % original.length] as Face
        ];
      }),
    ]),
  ) as Record<Face, Color[]>;
  return freezeFacelets(value);
}
function parity(pieces: number[]): number {
  let inversions = 0;
  for (let i = 0; i < pieces.length; i++)
    for (let j = i + 1; j < pieces.length; j++) if (pieces[i] > pieces[j]) inversions++;
  return inversions % 2;
}
export function validateFacelets(value: unknown, solved: CubeState): FaceletValidation {
  const issues: FaceletIssue[] = [];
  const fail = (): FaceletValidation => ({ ok: false, issues });
  const issue = (code: FaceletIssueCode, message: string, cells: FaceletRef[] = []) =>
    issues.push({ code, message, cells });
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 6 ||
    !FACE_ENTRY_ORDER.every(
      (face) =>
        Object.hasOwn(value, face) &&
        Array.isArray((value as Record<string, unknown>)[face]) &&
        (value as Record<string, unknown[]>)[face].length === 9,
    )
  ) {
    issue('shape', 'Enter exactly six faces with nine stickers on each face.');
    return fail();
  }
  const faces = value as Record<Face, unknown[]>;
  for (const face of FACE_ENTRY_ORDER) {
    for (let index = 0; index < 9; index++) {
      const color = faces[face][index];
      if (color !== null && !colorNames.includes(color as Color))
        issue('unknown-color', 'Choose one of the six named colors, or erase the sticker.', [
          { face, index },
        ]);
    }
  }
  if (issues.length) return fail();
  for (const face of FACE_ENTRY_ORDER)
    if (faces[face][4] !== COLORS[face])
      issue(
        'center',
        `${FACE_NAMES[face]} must have a ${COLORS[face]} center. This version uses the standard center scheme.`,
        [{ face, index: 4 }],
      );
  if (issues.length) return fail();
  const unfilled: FaceletRef[] = [];
  for (const face of FACE_ENTRY_ORDER)
    for (let index = 0; index < 9; index++)
      if (faces[face][index] === null) unfilled.push({ face, index });
  if (unfilled.length) {
    issue(
      'unfilled',
      `Fill the remaining ${unfilled.length} stickers before checking your cube.`,
      unfilled,
    );
    return fail();
  }
  for (const color of colorNames) {
    const cells: FaceletRef[] = [];
    for (const face of FACE_ENTRY_ORDER)
      for (let index = 0; index < 9; index++)
        if (faces[face][index] === color) cells.push({ face, index });
    if (cells.length !== 9)
      issue(
        'color-count',
        `There are ${cells.length} ${color} stickers; exactly nine are needed, including the center.`,
        cells.length > 9 ? cells : [],
      );
  }
  if (issues.length) return fail();
  const data = structuredClone(solved.data);
  for (const orbit of ['EDGES', 'CORNERS'] as const) {
    const names = orbit === 'EDGES' ? EDGE_SLOTS : CORNER_SLOTS;
    const references = names.map(() => [] as FaceletRef[]);
    for (const face of FACE_ENTRY_ORDER)
      FACELET_LAYOUT[face].forEach((position, index) => {
        if (position.orbit === orbit) references[position.slot][position.sticker] = { face, index };
      });
    const decoded: number[] = [];
    references.forEach((cells, slot) => {
      const entered = cells.map((cell) => faces[cell.face][cell.index]);
      const piece = names.findIndex(
        (name) =>
          [...name].every((face) => entered.includes(COLORS[face as Face])) &&
          new Set(entered).size === entered.length,
      );
      if (piece < 0) {
        issue(
          'piece-colors',
          `The colors at ${names[slot]} do not form a real ${orbit === 'EDGES' ? 'edge' : 'corner'}. Review this piece and your holding direction.`,
          cells,
        );
        return;
      }
      const original = [...names[piece]].map((face) => COLORS[face as Face]);
      const orientation = original.findIndex((_, shift) =>
        entered.every((color, i) => color === original[(i + shift) % original.length]),
      );
      if (orientation < 0) {
        issue(
          'mirrored-corner',
          `The corner at ${names[slot]} has mirrored color order. Check its three stickers and the holding directions.`,
          cells,
        );
        return;
      }
      decoded[slot] = piece;
      data[orbit].pieces[slot] = piece;
      data[orbit].orientation[slot] = orientation;
    });
    for (let piece = 0; piece < names.length; piece++) {
      const positions = decoded.flatMap((value, slot) => (value === piece ? [slot] : []));
      if (positions.length > 1)
        issue(
          'duplicate-piece',
          `The ${names[piece]} piece appears more than once, so another piece is missing. Review these stickers.`,
          positions.flatMap((slot) => references[slot]),
        );
    }
  }
  if (issues.length) return fail();
  if (data.EDGES.orientation.reduce((sum, value) => sum + value, 0) % 2)
    issue(
      'edge-orientation',
      'The edge orientations cannot result from normal turns. Review the entered faces and holding directions; an entry error may be the cause.',
    );
  if (data.CORNERS.orientation.reduce((sum, value) => sum + value, 0) % 3)
    issue(
      'corner-orientation',
      'The corner orientations cannot result from normal turns. Review the entered faces and holding directions; an entry error may be the cause.',
    );
  if (parity(data.EDGES.pieces) !== parity(data.CORNERS.pieces))
    issue(
      'permutation-parity',
      'The edge and corner arrangement cannot result from normal turns. Review all six faces; this check cannot identify one incorrect sticker.',
    );
  if (issues.length) return fail();
  const facelets = freezeFacelets(
    Object.fromEntries(FACE_ENTRY_ORDER.map((face) => [face, [...faces[face]]])) as Record<
      Face,
      Color[]
    >,
  );
  return { ok: true, state: copyCubeState(data), facelets };
}
