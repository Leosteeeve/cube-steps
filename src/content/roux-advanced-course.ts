import type { Lesson } from './course-types';
import type { StageId } from '../core/types';
import { ADVANCED_ROUX_LESSON_IDS } from './roux-advanced/lesson-ids';
import { ADVANCED_ROUX_TEXT } from './roux-advanced/details';
import { ADVANCED_ROUX_EXAMPLES, type RouxWorkedExample } from './roux-advanced/examples';
export const ADVANCED_ROUX_DETAILS: Readonly<
  Record<
    string,
    {
      overview: string;
      workedExamples: readonly RouxWorkedExample[];
      mistakes: readonly { symptom: string; explanation: string; recovery: string }[];
      physicalChecks: readonly string[];
      referenceIds: readonly string[];
    }
  >
> = Object.fromEntries(
  ADVANCED_ROUX_LESSON_IDS.map((id) => {
    const t = ADVANCED_ROUX_TEXT[id],
      workedExamples = ADVANCED_ROUX_EXAMPLES.filter((x) => x.lessonIds.includes(id));
    return [
      id,
      {
        overview: t.overview,
        workedExamples,
        mistakes: [{ symptom: t.mistake[0], explanation: t.mistake[1], recovery: t.mistake[2] }],
        physicalChecks: t.checks,
        referenceIds: workedExamples.flatMap((x) => (x.formulaId ? [x.formulaId] : [])),
      },
    ];
  }),
);
export const ADVANCED_ROUX_COURSE: readonly Lesson[] = ADVANCED_ROUX_LESSON_IDS.map((id) => {
  const t = ADVANCED_ROUX_TEXT[id],
    detail = ADVANCED_ROUX_DETAILS[id];
  return {
    id,
    ...(id.startsWith('ar-') ? { stageId: id as StageId } : {}),
    title: t.title,
    shortTitle: t.shortTitle,
    goal: t.overview.split('. ')[0] + '.',
    observe: t.observe,
    prepare: t.prepare,
    check: t.check,
    tip: t.tip,
    algorithmIds: [...detail.referenceIds],
    exampleScramble: '',
    examples: detail.workedExamples,
  };
});
