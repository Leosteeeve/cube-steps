import type { AlgorithmRegistry, LastLayerMatch } from '../types';
import catalog from './oll-catalog.json';
import recognition from './oll-recognition.json';
export const OLL_CATALOG: AlgorithmRegistry = catalog as AlgorithmRegistry;
export const OLL_RECOGNITION: Readonly<Record<string, LastLayerMatch>> = recognition as Record<
  string,
  LastLayerMatch
>;
