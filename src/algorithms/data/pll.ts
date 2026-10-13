import type { AlgorithmRegistry, LastLayerMatch } from '../types';
import catalog from './pll-catalog.json';
import recognition from './pll-recognition.json';
export const PLL_CATALOG = catalog as AlgorithmRegistry;
export const PLL_RECOGNITION = recognition as Readonly<Record<string, LastLayerMatch>>;
