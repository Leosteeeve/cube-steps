import type { AlgorithmRegistry, AlgorithmCase, AlgorithmVariant } from './types';
import { admitRegistry } from './admission';
import { F2L_CATALOG } from './data/f2l';
import { OLL_CATALOG } from './data/oll';
import { PLL_CATALOG } from './data/pll';
// Families are admitted here as their independently verified data land.
export const ALGORITHM_REGISTRY: AlgorithmRegistry = {
  cases: { ...F2L_CATALOG.cases, ...OLL_CATALOG.cases, ...PLL_CATALOG.cases },
  variants: { ...F2L_CATALOG.variants, ...OLL_CATALOG.variants, ...PLL_CATALOG.variants },
  preparations: { ...F2L_CATALOG.preparations },
};
admitRegistry(ALGORITHM_REGISTRY);
export function getAlgorithmCase(id: string): AlgorithmCase | undefined {
  return ALGORITHM_REGISTRY.cases[id];
}
export function getAlgorithmVariant(id: string): AlgorithmVariant | undefined {
  return ALGORITHM_REGISTRY.variants[id];
}
