import type { MethodPresentation } from '../contracts';
import { CFOP_INFO } from '../info';
import { CFOP_ALGORITHMS } from './catalog';
export const CFOP_PRESENTATION: MethodPresentation = { ...CFOP_INFO, algorithms: CFOP_ALGORITHMS };
