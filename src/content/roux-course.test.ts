import { expect, it } from 'vitest';
import { ROUX_COURSE, ROUX_LESSON_DETAILS } from './roux-course';
import { ROUX_INFO } from '../methods/info';
it('teaches all eight real chapters with checks, recovery and worked examples', () => {
  expect(ROUX_COURSE.map((l) => l.stageId)).toEqual(ROUX_INFO.stages.map((s) => s.id));
  expect(ROUX_COURSE[0]).toMatchObject({ id: 'intro', stageId: 'roux-frame' });
  for (const chapter of ROUX_COURSE) {
    const detail = ROUX_LESSON_DETAILS[chapter.id];
    expect(detail.workedExamples.length).toBeGreaterThan(0);
    expect(detail.mistakes.length).toBeGreaterThan(0);
    expect(detail.physicalChecks.length).toBeGreaterThan(0);
    for (const text of [
      chapter.observe,
      chapter.prepare,
      chapter.check,
      chapter.tip,
      detail.overview,
    ])
      expect(text.length).toBeGreaterThan(40);
  }
});
