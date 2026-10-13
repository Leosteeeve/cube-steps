import type { Face, TeachingMove } from '../../core/types';
export type NotationBase = Face | `${Face}w` | 'x' | 'y' | 'z' | 'M' | 'E' | 'S';
export type NotationAmount = '' | "'" | '2';
export interface NotationSelection {
  base: NotationBase;
  amount: NotationAmount;
}
export interface NotationEntry {
  base: NotationBase;
  family: 'face' | 'wide' | 'rotation' | 'slice';
  name: string;
  referenceFace: Face;
  axis: 'x' | 'y' | 'z';
  layers: readonly (-1 | 0 | 1)[];
  layerText: string;
}
export const FACE_WORDS: Record<Face, string> = {
  U: 'Up',
  D: 'Down',
  L: 'Left',
  R: 'Right',
  F: 'Front',
  B: 'Back',
};
const faceAxes: Record<Face, { axis: NotationEntry['axis']; sign: -1 | 1 }> = {
  U: { axis: 'y', sign: 1 },
  D: { axis: 'y', sign: -1 },
  L: { axis: 'x', sign: -1 },
  R: { axis: 'x', sign: 1 },
  F: { axis: 'z', sign: 1 },
  B: { axis: 'z', sign: -1 },
};
const faces: readonly Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
export const NOTATION_ENTRIES: readonly NotationEntry[] = [
  ...faces.map((face): NotationEntry => ({
    base: face,
    family: 'face',
    name: `${FACE_WORDS[face]} face`,
    referenceFace: face,
    axis: faceAxes[face].axis,
    layers: [faceAxes[face].sign],
    layerText: `Only the ${FACE_WORDS[face].toLowerCase()} layer moves.`,
  })),
  ...(['x', 'y', 'z'] as const).map((base, i): NotationEntry => ({
    base,
    family: 'rotation',
    name: `${base.toUpperCase()} rotation`,
    referenceFace: (['R', 'U', 'F'] as const)[i],
    axis: base,
    layers: [-1, 0, 1],
    layerText: 'The whole cube moves together. This is a physical regrip.',
  })),
  ...faces.map((face): NotationEntry => ({
    base: `${face}w`,
    family: 'wide',
    name: `${FACE_WORDS[face]} wide`,
    referenceFace: face,
    axis: faceAxes[face].axis,
    layers: [faceAxes[face].sign, 0],
    layerText: `The ${FACE_WORDS[face].toLowerCase()} layer and its adjacent middle slice move together.`,
  })),
  ...(['M', 'E', 'S'] as const).map((base, i): NotationEntry => ({
    base,
    family: 'slice',
    name: (['Middle slice', 'Equatorial slice', 'Standing slice'] as const)[i],
    referenceFace: (['L', 'D', 'F'] as const)[i],
    axis: (['x', 'y', 'z'] as const)[i],
    layers: [0],
    layerText: `Only the middle slice between ${(['L and R', 'U and D', 'F and B'] as const)[i]} moves, including its centers. Keep the outer layers still.`,
  })),
];
export function notationToken(selection: NotationSelection): TeachingMove {
  if (
    !NOTATION_ENTRIES.some((entry) => entry.base === selection.base) ||
    !['', "'", '2'].includes(selection.amount)
  )
    throw new Error('Choose a listed move and a plain, prime or half turn.');
  return `${selection.base}${selection.amount}`;
}
export function describeNotation(selection: NotationSelection): {
  display: string;
  spoken: string;
  instruction: string;
} {
  const token = notationToken(selection);
  const entry = NOTATION_ENTRIES.find((value) => value.base === selection.base)!;
  const direction =
    selection.amount === '2'
      ? 'half a turn (180°), in either direction'
      : selection.amount === "'"
        ? 'counterclockwise (90°)'
        : 'clockwise (90°)';
  const subject =
    entry.family === 'rotation'
      ? 'Regrip the whole cube'
      : entry.family === 'slice'
        ? 'Turn only the middle slice'
        : entry.family === 'wide'
          ? 'Turn both highlighted layers together'
          : 'Turn the highlighted face';
  return {
    display: token.replace("'", '′'),
    spoken: `${entry.base}${selection.amount === "'" ? ' prime' : selection.amount === '2' ? ' two' : ''}, ${entry.name.toLowerCase()}, ${direction}`,
    instruction: `${subject} ${direction}, as viewed from outside the ${FACE_WORDS[entry.referenceFace]} (${entry.referenceFace}) face.`,
  };
}
