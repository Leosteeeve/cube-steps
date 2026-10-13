import type { MethodId } from '../../core/types';
import { methodRoute } from '../../app/routes';
import type { QuizAnswers } from './types';
export function recommendRoute(a: QuizAnswers): {
  method: MethodId;
  firstLessonHref: string;
  reasons: string[];
  nextStep: string;
} {
  const method: MethodId =
    a.ability === 'new'
      ? 'lbl'
      : a.ability === 'two-look' && a.goal === 'advanced'
        ? 'cfop-advanced'
        : 'cfop-beginner';
  const why =
    a.ability === 'new'
      ? 'Build toward your first independent solve, starting with notation and the white daisy.'
      : method === 'cfop-advanced'
        ? 'Your F2L and two-look last-layer foundation makes a small set of full OLL and PLL formulas a useful next step.'
        : a.ability === 'f2l'
          ? 'Keep your F2L foundation and strengthen two-look last-layer recognition.'
          : 'Build on your independent solves with a direct-bottom cross, paired F2L, and two-look last-layer steps.';
  const setting =
    a.setting === 'club'
      ? 'Follow one club lesson with someone, then explain a move back to them.'
      : a.setting === 'home'
        ? 'At home, pause the lesson and check your physical cube after each action.'
        : 'Try a lesson together, then repeat the same small section at home.';
  return {
    method,
    firstLessonHref: methodRoute(method, 'learn'),
    reasons: [why, setting],
    nextStep:
      a.duration === 'short'
        ? 'Practice one lesson segment or one small formula group. Stop at a clear checkpoint.'
        : 'Learn one segment, then add a second review or practice segment before moving on.',
  };
}
