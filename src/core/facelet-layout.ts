import type { Face } from './types';
import { CENTER_SLOTS, CORNER_SLOTS, EDGE_SLOTS } from './observations';
export const FACE_ENTRY_ORDER: readonly Face[] = ['F', 'R', 'B', 'L', 'U', 'D'];
export const FACE_GUIDES: Record<Face, { top: Face; right: Face }> = {
  F: { top: 'U', right: 'R' },
  R: { top: 'U', right: 'B' },
  B: { top: 'U', right: 'L' },
  L: { top: 'U', right: 'F' },
  U: { top: 'B', right: 'R' },
  D: { top: 'F', right: 'R' },
};
export const FACE_NAMES: Record<Face, string> = {
  F: 'Front',
  R: 'Right',
  B: 'Back',
  L: 'Left',
  U: 'Up',
  D: 'Down',
};
// Outside-view rows, with neighboring centers in FACE_GUIDES.
// Cubie names retain Reid's cyclic sticker order.
const slots: Record<Face, string> = {
  F: 'ULF UF UFR FL F FR DFL DF DRF',
  R: 'UFR UR URB FR R BR DRF DR DBR',
  B: 'URB UB UBL BR B BL DBR DB DLB',
  L: 'UBL UL ULF BL L FL DLB DL DFL',
  U: 'UBL UB URB UL U UR ULF UF UFR',
  D: 'DFL DF DRF DL D DR DLB DB DBR',
};
export type FaceletPosition = {
  orbit: 'EDGES' | 'CORNERS' | 'CENTERS';
  slot: number;
  sticker: number;
};
export const FACELET_LAYOUT: Record<Face, readonly FaceletPosition[]> = Object.fromEntries(
  FACE_ENTRY_ORDER.map((face) => [
    face,
    slots[face].split(' ').map((name) => {
      const orbit = name.length === 3 ? 'CORNERS' : name.length === 2 ? 'EDGES' : 'CENTERS';
      const names: readonly string[] =
        orbit === 'CORNERS' ? CORNER_SLOTS : orbit === 'EDGES' ? EDGE_SLOTS : CENTER_SLOTS;
      return { orbit, slot: names.indexOf(name), sticker: name.indexOf(face) };
    }),
  ]),
) as Record<Face, FaceletPosition[]>;
