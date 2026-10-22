import type { SolveInput, RouxStageId } from '../../core/types';
import fixtures from './example-fixtures.json';
export interface RouxWorkedExample {
  id:string; lessonId:string; input:SolveInput; expectedRuleIds:readonly string[];
  expectedStage:RouxStageId; caption:string;
}
// Reproducible legal inputs and authored claims are checked by build-course-examples.
export const ROUX_WORKED_EXAMPLES = fixtures as readonly RouxWorkedExample[];
