import type { TeachingAlgorithm } from '../methods/contracts';
import type { CubeState, FaceMove, TeachingMove } from '../core/types';
import type { F2LTarget } from '../methods/advanced/f2l/types';
export interface CaseFixture {
  id: string;
  caseId: CaseId;
  setup: readonly FaceMove[];
  holdingMoves: readonly TeachingMove[];
  initial: CubeState;
  target?: F2LTarget;
  protectedIds: readonly string[];
}
export type AlgorithmFamily = 'f2l' | 'oll' | 'pll';
export type CaseId = string;
export type VariantId = string;
export interface SourceReference {
  title: string;
  url: string;
  reference: string;
}
export interface AlgorithmCase {
  id: CaseId;
  family: AlgorithmFamily;
  label: string;
  group: string;
  canonicalSignature: string;
  recognition: string;
  defaultVariantId: VariantId;
  variantIds: readonly VariantId[];
  fixtureIds: readonly string[];
  sourceRefs: readonly SourceReference[];
}
export interface AlgorithmVariant extends TeachingAlgorithm {
  id: VariantId;
  caseId: CaseId;
  startSignature: string;
  targetSlot?: 'FR' | 'FL' | 'BR' | 'BL';
  executionPenalty: 0 | 1 | 2;
  sourceRefs: readonly SourceReference[];
}
export interface AlgorithmRegistry {
  cases: Readonly<Record<CaseId, AlgorithmCase>>;
  variants: Readonly<Record<VariantId, AlgorithmVariant>>;
  preparations: Readonly<Record<string, TeachingAlgorithm>>;
}
