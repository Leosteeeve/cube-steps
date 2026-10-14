import { useEffect } from 'react';
import { LearnPage } from '../../app/LearnPage';
import type { CubeEngine, MethodId } from '../../core/types';
import { ProgressStatus, useClubProgress } from './use-club-progress';
import { useGuidanceTarget } from '../../ui/guidance';
export function ClubLearnPage({
  engine,
  method,
  lessonId,
}: {
  engine: CubeEngine;
  method: MethodId;
  lessonId: string;
}) {
  const { progress, visitLesson, setPracticed } = useClubProgress();
  const practiceTarget = useGuidanceTarget('lesson.practice');
  useEffect(() => visitLesson(method, lessonId), [method, lessonId, visitLesson]);
  return (
    <LearnPage
      key={method + '/' + lessonId}
      engine={engine}
      method={method}
      lessonId={lessonId}
      presentation="club"
      footer={
        <section ref={practiceTarget} className="club-lesson-progress">
          <label>
            <input
              type="checkbox"
              checked={progress.practiced[method]?.includes(lessonId) ?? false}
              onChange={(e) => setPracticed(method, lessonId, e.target.checked)}
            />
            Mark as practiced
          </label>
          <p>
            This is self-reported practice, not a test of mastery. Revisit any lesson whenever you
            need.
          </p>
          <ProgressStatus />
        </section>
      }
    />
  );
}
