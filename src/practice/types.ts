import type { AlgorithmDemonstration } from '../algorithms/demonstration';
export interface PracticeExercise {
  caseId: string;
  fixtureId: string;
  variantId: string;
  demonstration: AlgorithmDemonstration;
}
