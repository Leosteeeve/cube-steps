import type { MethodPresentation } from '../contracts';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
export const ADVANCED_PRESENTATION: MethodPresentation = {
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
  algorithms: { ...ALGORITHM_REGISTRY.variants, ...ALGORITHM_REGISTRY.preparations },
};
