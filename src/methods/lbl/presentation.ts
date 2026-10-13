import type { MethodPresentation } from '../contracts';
import { LBL_INFO } from '../info';
import { LBL_ALGORITHMS } from './catalog';
export const LBL_PRESENTATION: MethodPresentation = { ...LBL_INFO, algorithms: LBL_ALGORITHMS };
