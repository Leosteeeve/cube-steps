import type { CubeEngine } from '../core/types';
import { isPracticeRequest, type PracticeReply } from './practice-protocol';
import { generatePracticeExercise } from '../practice/generate';
export function handlePracticeRequest(engine: CubeEngine, raw: unknown): PracticeReply | null {
  if (!isPracticeRequest(raw)) return null;
  const identity = {
    requestId: raw.requestId,
    caseId: raw.caseId,
    fixtureId: raw.fixtureId,
    variantId: raw.variantId,
  };
  try {
    return { ...identity, result: { ok: true, exercise: generatePracticeExercise(engine, raw) } };
  } catch (e) {
    return {
      ...identity,
      result: {
        ok: false,
        message:
          'No verified exercise was produced: ' + (e instanceof Error ? e.message : String(e)),
      },
    };
  }
}
