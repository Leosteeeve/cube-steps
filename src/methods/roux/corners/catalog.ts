import type { TeachingMove } from '../../../core/types';
import type { TeachingAlgorithm } from '../../contracts';
const sequences: Record<string, [string, string]> = {
  'roux-ocll-21': ['OCLL 21', "R U2 R' U' R U R' U' R U' R'"],
  'roux-ocll-22': ['OCLL 22', "R U2 R2 U' R2 U' R2 U2 R"],
  'roux-ocll-23': ['OCLL 23', "R2 D R' U2 R D' R' U2 R'"],
  'roux-ocll-24': ['OCLL 24', "R U R D R' U' R D' R2"],
  'roux-ocll-25': ['OCLL 25', "R' F R B' R' F' R B"],
  'roux-ocll-26': ['Anti-Sune', "R U2 R' U' R U' R'"],
  'roux-ocll-27': ['Sune', "R U R' U R U2 R'"],
  'roux-t': ['T-perm', "R U R' U' R' F R2 U' R' U' R U R' F'"],
  'roux-y': ['Y-perm', "F R U' R' U' R U R' F' R U R' U' R' F R F'"],
};
export const ROUX_CORNER_ALGORITHMS: Readonly<Record<string, TeachingAlgorithm>> =
  Object.fromEntries(
    Object.entries(sequences).map(([id, [name, text]]) => [
      id,
      {
        name,
        moves: text.split(' ') as TeachingMove[],
        precondition: id.includes('ocll')
          ? 'Both side blocks complete; match the four yellow corner stickers in the shown hold.'
          : id === 'roux-t'
            ? 'Both blocks complete, yellow corners up, with the matching corner headlights on the left.'
            : 'Both blocks complete, yellow corners up, and no matching corner headlights on any side.',
        effect: id.includes('ocll')
          ? 'Turn the four yellow corner stickers upward and restore both side blocks. Edges are unrestricted.'
          : 'Restore both side blocks and arrange the top corners in their correct cyclic order. Align U afterward as shown.',
      },
    ]),
  );
