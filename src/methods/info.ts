import type { MethodId } from '../core/types';
import type { MethodPresentation } from './contracts';
export type MethodInfo = Omit<MethodPresentation, 'algorithms'>;
export const LBL_INFO: MethodInfo = {
  id: 'lbl',
  label: 'LBL',
  teachingStatus: 'accepted',
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

export const CFOP_INFO: MethodInfo = {
  id: 'cfop-beginner',
  label: 'Beginner CFOP',
  teachingStatus: 'accepted',
  stages: [
    { id: 'cfop-cross', label: 'Direct white cross', group: 'Cross' },
    { id: 'cfop-f2l', label: 'First two layers', group: 'F2L' },
    { id: 'cfop-oll-edges', label: 'Orient yellow edges', group: 'OLL' },
    { id: 'cfop-oll-corners', label: 'Orient yellow corners', group: 'OLL' },
    { id: 'cfop-pll-corners', label: 'Permute yellow corners', group: 'PLL' },
    { id: 'cfop-pll-edges', label: 'Permute yellow edges', group: 'PLL' },
    { id: 'cfop-auf', label: 'Final alignment', group: 'Finish' },
  ],
};

export const ADVANCED_INFO: MethodInfo = {
  id: 'cfop-advanced',
  label: 'Advanced CFOP',
  teachingStatus: 'preview',
  stages: [
    { id: 'advanced-cross', label: 'Shortest white cross', group: 'Cross' },
    { id: 'advanced-f2l', label: 'Efficient F2L', group: 'F2L' },
    { id: 'advanced-oll', label: 'Full OLL', group: 'OLL' },
    { id: 'advanced-pll', label: 'Full PLL', group: 'PLL' },
    { id: 'advanced-auf', label: 'Final alignment', group: 'Finish' },
  ],
};

export function getMethodInfo(id: MethodId): MethodInfo {
  if (id === 'lbl') return LBL_INFO;
  if (id === 'cfop-beginner') return CFOP_INFO;
  if (id === 'cfop-advanced') return ADVANCED_INFO;
  throw new Error(`Method ${id} is not registered.`);
}
