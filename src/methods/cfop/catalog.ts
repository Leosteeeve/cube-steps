import type { CFOPStageId, TeachingMove } from '../../core/types';
import type { TeachingAlgorithm } from '../contracts';
function algorithm(name: string, moves: string, precondition: string, effect: string): TeachingAlgorithm {
  return { name, moves: moves.split(' ') as TeachingMove[], precondition, effect };
}
const edges = 'F2L is solved. Match the yellow edge pattern on top.';
const corners = 'F2L and the yellow cross are solved. Match the yellow corner stickers.';
const cp = 'The yellow face is oriented. Match the relative order of the four corners.';
const ep = 'The yellow face and relative corner order are correct. Match the edge cycle.';
export const CFOP_ALGORITHMS: Record<string, TeachingAlgorithm> = {
  'oll-edge-line': algorithm('Yellow line', "F R U R' U' F'", edges, 'Make the yellow cross while restoring F2L.'),
  'oll-edge-l': algorithm('Yellow L', "F U R U' R' F'", edges, 'Make the yellow cross while restoring F2L.'),
  'oll-edge-dot': { ...algorithm('Yellow dot', "F R U R' U' F' U2 F U R U' R' F'", edges, 'Turn the dot into an L, align it, then complete the cross.'), segments: [{ label: 'Make an L', start: 0, end: 6 }, { label: 'Align the L', start: 6, end: 7 }, { label: 'Complete the cross', start: 7, end: 13 }] },
  'oll-corner-21': algorithm('OLL 21: double headlights', "R U2 R' U' R U R' U' R U' R'", corners, 'Orient all four yellow corners.'),
  'oll-corner-22': algorithm('OLL 22: diagonal headlights', "R U2 R2 U' R2 U' R2 U2 R", corners, 'Orient all four yellow corners.'),
  'oll-corner-23': algorithm('OLL 23: headlights', "R2 D R' U2 R D' R' U2 R'", corners, 'Orient all four yellow corners.'),
  'oll-corner-24': algorithm('OLL 24: chameleon', "R U R D R' U' R D' R2", corners, 'Orient all four yellow corners.'),
  'oll-corner-25': algorithm('OLL 25: bow tie', "R' F R B' R' F' R B", corners, 'Orient all four yellow corners.'),
  'oll-corner-26': algorithm('OLL 26: anti-Sune', "R U2 R' U' R U' R'", corners, 'Orient all four yellow corners.'),
  'oll-corner-27': algorithm('OLL 27: Sune', "R U R' U R U2 R'", corners, 'Orient all four yellow corners.'),
  'pll-t': algorithm('T permutation: adjacent corners', "R U R' U' R' F R2 U' R' U' R U R' F'", cp, 'Put the corners in cyclic order; the edges may still need a formula.'),
  'pll-y': algorithm('Y permutation: diagonal corners', "F R U' R' U' R U R' F' R U R' U' R' F R F'", cp, 'Put the corners in cyclic order; the edges may still need a formula.'),
  'pll-ua': algorithm('Ua permutation', "R U' R U R U R U' R' U' R2", ep, 'Cycle three edges and preserve corner order.'),
  'pll-ub': algorithm('Ub permutation', "R2 U R U R' U' R' U' R' U R'", ep, 'Cycle three edges in the opposite direction and preserve corner order.'),
  'pll-h': algorithm('H permutation', 'M2 U M2 U2 M2 U M2', ep, 'Swap both opposite edge pairs and restore the centers.'),
  'pll-z': algorithm('Z permutation', "M2 U M2 U M' U2 M2 U2 M'", ep, 'Swap adjacent edge pairs and restore the centers; final U alignment is separate.'),
  'f2l-right-away': algorithm('Open right, move away, close', "R U R'", 'Use an unprotected front-right slot and the recognized pair arrangement.', 'Move the selected pieces through the open slot, restoring the cross and all protected pairs.'),
  'f2l-right-toward': algorithm('Open right, move toward, close', "R U' R'", 'Use an unprotected front-right slot and the recognized pair arrangement.', 'Move the selected pieces through the open slot, restoring the cross and all protected pairs.'),
  'f2l-right-half': algorithm('Open right, move across, close', "R U2 R'", 'Use an unprotected front-right slot and the recognized pair arrangement.', 'Change the corner-edge relationship with a half turn, then restore the cross and protected pairs.'),
  'f2l-left-toward': algorithm('Open front, move toward, close', "F' U F", 'Use an unprotected front-right slot and the recognized pair arrangement.', 'Move the selected pieces through the open slot, restoring the cross and all protected pairs.'),
  'f2l-left-away': algorithm('Open front, move away, close', "F' U' F", 'Use an unprotected front-right slot and the recognized pair arrangement.', 'Move the selected pieces through the open slot, restoring the cross and all protected pairs.'),
  'f2l-left-half': algorithm('Open front, move across, close', "F' U2 F", 'Use an unprotected front-right slot and the recognized pair arrangement.', 'Change the corner-edge relationship with a half turn, then restore the cross and protected pairs.'),
};
export const LAST_LAYER_CASES: { id: string; stage: CFOPStageId }[] = Object.keys(CFOP_ALGORITHMS).filter(id => !id.startsWith('f2l-')).map(id => ({ id, stage: id.startsWith('oll-edge-') ? 'cfop-oll-edges' : id.startsWith('oll-corner-') ? 'cfop-oll-corners' : ['pll-t', 'pll-y'].includes(id) ? 'cfop-pll-corners' : 'cfop-pll-edges' }));
