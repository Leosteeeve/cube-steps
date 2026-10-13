import type { MethodPresentation } from '../contracts';
import { CFOP_ALGORITHMS } from './catalog';
export const CFOP_PRESENTATION: MethodPresentation = {
  id: 'cfop-beginner',
  label: 'Beginner CFOP',
  teachingStatus: 'accepted',
  algorithms: CFOP_ALGORITHMS,
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
