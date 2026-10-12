export const NOTATION_FACES = [
  ['U', 'Up', 'The top face'],
  ['R', 'Right', 'The right face'],
  ['F', 'Front', 'The face looking at you'],
  ['D', 'Down', 'The bottom face'],
  ['L', 'Left', 'The left face'],
  ['B', 'Back', 'The face away from you'],
] as const;
export const HOLDING_BASICS = [
  'Centers set the face colors. An edge has two stickers; a corner has three. A piece is solved when every sticker matches the center beside it.',
  'Start a scramble on a solved cube with white up and green front. Keep that grip while reading the scramble from left to right.',
  'A letter means a clockwise quarter turn as seen while looking directly at that face. A prime (′) reverses it; 2 means a half turn. For example, R U R′ U′ is four separate moves.',
  'Face letters refer to your current grip. U is always the top face, even after the yellow side moves there. UF means the edge between up and front; UFR means the corner between up, front and right.',
  'x, y and z rotate the whole cube in the direction of R, U and F. A prime reverses the rotation and 2 turns it halfway. These regrips appear explicitly in lessons. Dragging the view is only for looking around.',
];
export const CFOP_NOTATION = [
  'M turns only the middle slice between L and R, in the same direction as L. M′ reverses that direction; M2 is a half turn. Keep the two outer faces still. This is a slice move, not a whole-cube regrip.',
  'AUF means adjust the upper face: use U, U′ or U2 to align the top layer’s side colors with their centers after the last-layer formula. If they already match, no AUF is needed.',
];
