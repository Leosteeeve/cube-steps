import type { TeachingMove } from '../../core/types';
export interface TeachingAlgorithm {
  name: string;
  moves: TeachingMove[];
  precondition: string;
  effect: string;
}
const entry = (
  name: string,
  moves: string,
  precondition: string,
  effect: string,
): TeachingAlgorithm => ({ name, moves: moves.split(' ') as TeachingMove[], precondition, effect });
export const LBL_ALGORITHMS = {
  'right-trigger': entry(
    'Right-hand trigger',
    "R U R' U'",
    'Place the working corner at front-right.',
    'Cycle the working corner; always finish all four moves.',
  ),
  'left-trigger': entry(
    'Left-hand trigger',
    "L' U' L U",
    'Place the working corner at front-left.',
    'Cycle the working corner with the left hand.',
  ),
  'daisy-to-cross': entry(
    'Lower a matched daisy petal',
    'F2',
    'Yellow is up; white faces up at UF and its other sticker matches the front center.',
    'Send the white petal to the bottom cross while preserving the other petals and matched cross edges.',
  ),
  'middle-right': entry(
    'Insert edge to the right',
    "U R U' R' U' F' U F",
    'White is down; the UF edge matches the front center and belongs on the right.',
    'Insert the edge at FR and restore the first layer.',
  ),
  'middle-left': entry(
    'Insert edge to the left',
    "U' L' U L U F U' F'",
    'White is down; the UF edge matches the front center and belongs on the left.',
    'Insert the edge at FL and restore the first layer.',
  ),
  'top-cross': entry(
    'Make the yellow cross',
    "F R U R' U' F'",
    'Yellow is up. Hold a line left-right or an L at back-left.',
    'Orient more yellow edges while restoring the first two layers.',
  ),
  'top-edge-cycle': entry(
    'Cycle the top edges',
    "R U R' U R U2 R'",
    'Yellow is up. Prepare the matched edges before cycling.',
    'Cycle top edges while keeping their yellow stickers up.',
  ),
  'top-corner-cycle': entry(
    'Position the top corners',
    "U R U' L' U R' U' L",
    'Yellow is up; a correctly positioned corner, if present, is at UFR.',
    'Cycle the other three corners without moving the edges.',
  ),
} satisfies Record<string, TeachingAlgorithm>;
export type AlgorithmId = keyof typeof LBL_ALGORITHMS;
