import type { AlgorithmRegistry, AlgorithmCase, AlgorithmVariant } from './types';
import { admitRegistry } from './admission';
// Families are admitted here as their independently verified data land.
export const ALGORITHM_REGISTRY: AlgorithmRegistry = { cases: {}, variants: {}, preparations: {} };
admitRegistry(ALGORITHM_REGISTRY);
export function getAlgorithmCase(id: string): AlgorithmCase | undefined {
  return ALGORITHM_REGISTRY.cases[id];
}
export function getAlgorithmVariant(id: string): AlgorithmVariant | undefined {
  return ALGORITHM_REGISTRY.variants[id];
}
