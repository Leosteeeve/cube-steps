import type { AlgorithmRegistry, AlgorithmCase, AlgorithmVariant } from './types';
import { admitRegistry } from './admission';
import { F2L_CATALOG } from './data/f2l';
// Families are admitted here as their independently verified data land.
export const ALGORITHM_REGISTRY: AlgorithmRegistry = F2L_CATALOG;
admitRegistry(ALGORITHM_REGISTRY);
export function getAlgorithmCase(id: string): AlgorithmCase | undefined {
  return ALGORITHM_REGISTRY.cases[id];
}
export function getAlgorithmVariant(id: string): AlgorithmVariant | undefined {
  return ALGORITHM_REGISTRY.variants[id];
}
