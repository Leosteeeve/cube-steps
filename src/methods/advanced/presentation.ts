import type { MethodPresentation } from '../contracts';
import { ADVANCED_INFO } from '../info';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
export const ADVANCED_PRESENTATION: MethodPresentation = {
  ...ADVANCED_INFO,
  algorithms: { ...ALGORITHM_REGISTRY.variants, ...ALGORITHM_REGISTRY.preparations },
};
