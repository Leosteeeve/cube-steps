import type { StageId, SolveInput } from '../core/types';
export interface CaseExample {
  input?: SolveInput;
  id: string;
  title: string;
  scramble: string;
  expectedCaseId: string;
  stageId: StageId;
}
export interface Lesson<Algorithm extends string = string> {
  id: string;
  stageId?: StageId;
  title: string;
  shortTitle: string;
  goal: string;
  observe: string;
  prepare: string;
  check: string;
  tip: string;
  algorithmIds: Algorithm[];
  exampleScramble: string;
  examples?: readonly CaseExample[];
}
