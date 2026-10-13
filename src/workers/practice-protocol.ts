import type { PracticeExercise } from '../practice/types';
export interface PracticeRequest {
  requestId: number;
  caseId: string;
  fixtureId: string;
  variantId: string;
}
export interface PracticeReply extends PracticeRequest {
  result: { ok: true; exercise: PracticeExercise } | { ok: false; message: string };
}
export function isPracticeRequest(raw: unknown): raw is PracticeRequest {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Partial<PracticeRequest>;
  return (
    typeof r.requestId === 'number' &&
    Number.isSafeInteger(r.requestId) &&
    r.requestId >= 0 &&
    typeof r.caseId === 'string' &&
    typeof r.fixtureId === 'string' &&
    typeof r.variantId === 'string'
  );
}
