import type { MethodRuntime } from '../contracts';
import { CFOP_PRESENTATION } from './presentation';
import { checkCFOPStage } from './stages';
export const CFOP_RUNTIME: MethodRuntime = {
  presentation: CFOP_PRESENTATION, checkStage: checkCFOPStage,
  // Execution rules add their independently replayable contracts as they are admitted.
  checkAction: () => false,
};
