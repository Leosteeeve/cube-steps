import type { MethodPresentation, TeachingAlgorithm } from '../contracts';
import { ROUX_BLOCK_ALGORITHMS } from '../roux/blocks/catalog';
import { ROUX_LSE_ALGORITHMS } from '../roux/lse/catalog';
import { CMLL_CATALOG } from './cmll/catalog';
export const ADVANCED_ROUX_PRESENTATION: MethodPresentation = {
  id: 'roux-advanced',
  label: 'Advanced Roux',
  teachingStatus: 'preview',
  stages: [
    { id: 'ar-position', label: 'Choose your hold', group: 'Blocks' },
    { id: 'ar-first-block', label: 'First block', group: 'Blocks' },
    { id: 'ar-second-block', label: 'Second block', group: 'Blocks' },
    { id: 'ar-cmll', label: 'CMLL · top corners', group: 'Corners' },
    { id: 'ar-eolr', label: 'Orient & arrange edges', group: 'Last six edges' },
    { id: 'ar-last-four', label: 'Last four & alignment', group: 'Last six edges' },
  ],
  algorithms: { ...ROUX_BLOCK_ALGORITHMS, ...ROUX_LSE_ALGORITHMS, ...CMLL_CATALOG.variants },
};
export function advancedRouxPresentation(
  formulas: Readonly<Record<string, TeachingAlgorithm>> = {},
): MethodPresentation {
  return {
    ...ADVANCED_ROUX_PRESENTATION,
    algorithms: { ...ADVANCED_ROUX_PRESENTATION.algorithms, ...formulas },
  };
}
