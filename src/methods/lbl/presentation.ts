import type { MethodPresentation } from '../contracts';
import { LBL_ALGORITHMS } from './catalog';
export const LBL_PRESENTATION: MethodPresentation = {
  id: 'lbl',
  label: 'LBL',
  teachingStatus: 'accepted',
  algorithms: LBL_ALGORITHMS,
  stages: [
    { id: 'white-cross', label: 'White cross', group: 'Cross' },
    { id: 'first-layer', label: 'First-layer corners', group: 'First layer' },
    { id: 'middle-layer', label: 'Middle-layer edges', group: 'Middle layer' },
    { id: 'top-cross', label: 'Yellow cross', group: 'Last layer' },
    { id: 'top-edges', label: 'Match top edges', group: 'Last layer' },
    { id: 'top-corners', label: 'Position top corners', group: 'Last layer' },
    { id: 'corner-orientation', label: 'Orient top corners', group: 'Finish' },
  ],
};
