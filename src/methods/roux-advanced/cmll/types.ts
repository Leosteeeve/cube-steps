import type { TeachingAlgorithm } from '../../contracts';
import type { TeachingMove } from '../../../core/types';
import type { Quarter } from '../types';
export type CmllFamily = 'O' | 'H' | 'Pi' | 'U' | 'T' | 'Sune' | 'Anti-Sune' | 'L';
export type CmllMatch =
  | {
      caseId: string;
      family: CmllFamily;
      setup: readonly TeachingMove[];
      recognition: string;
      targetIds: readonly string[];
    }
  | { caseId: 'solved'; setup: readonly TeachingMove[] };
export interface CmllVariant extends TeachingAlgorithm {
  id: string;
  caseId: string;
  holdingMoves: readonly TeachingMove[];
  recognition: string;
  sourceRefs: readonly { url: string; title: string; accessed: string; usageNotes: string }[];
  executionProfileId: string;
  protectedIds: readonly string[];
  segments: { label: string; start: number; end: number }[];
  centerPhaseDelta: Quarter;
  edgeTransform: { permutation: readonly number[]; orientationDelta: readonly number[] };
  default: boolean;
}
export interface CmllCatalog {
  version: string;
  cases: readonly {
    id: string;
    family: CmllFamily;
    label: string;
    variantIds: readonly string[];
  }[];
  variants: Readonly<Record<string, CmllVariant>>;
  digest: string;
}
