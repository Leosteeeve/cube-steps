import type { CubeEngine } from '../../core/types';
import type { AppRoute } from '../../app/routes';
import { registerMethodRuntime } from '../../methods/registry';
import { ROUX_RUNTIME } from '../../methods/roux/definition';
import { ClubLearnPage } from '../learning/ClubLearnPage';
import { SolvePage } from '../../app/SolvePage';
import { registerRouxCourse } from '../../content/courses';
import { ROUX_COURSE } from '../../content/roux-course';
registerMethodRuntime(ROUX_RUNTIME);
registerRouxCourse(ROUX_COURSE);
export function RouxFeaturePage({
  engine,
  route,
}: {
  engine: CubeEngine;
  route: Extract<AppRoute, { kind: 'learn' | 'solve' }>;
}) {
  return route.kind === 'learn' ? (
    <ClubLearnPage engine={engine} method="roux-beginner" lessonId={route.lessonId} />
  ) : (
    <SolvePage engine={engine} method="roux-beginner" />
  );
}
