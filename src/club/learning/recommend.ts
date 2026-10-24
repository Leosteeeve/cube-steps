import type { MethodId } from '../../core/types';
import { methodRoute } from '../../app/routes';
import type { QuizAnswers } from './types';
export function recommendRoute(a: QuizAnswers): {
  method: MethodId;
  firstLessonHref: string;
  reasons: string[];
  nextStep: string;
  alternatives: readonly MethodId[];
} {
  const legacyMethod: MethodId =
    a.ability === 'new'
      ? 'lbl'
      : a.ability === 'two-look' && a.goal === 'advanced'
        ? 'cfop-advanced'
        : 'cfop-beginner';
  // Missing new answers preserve the old rule; they do not invent a preference.
  const method: MethodId =
    a.foundation === undefined || a.preference === undefined
      ? legacyMethod
      : a.ability === 'new' || a.foundation === 'none'
        ? 'lbl'
        : a.foundation === 'roux-basic' && a.goal === 'advanced' && a.preference !== 'layers'
          ? 'roux-advanced'
          : a.preference === 'blocks' ||
              (a.preference === 'unsure' && ['roux-blocks', 'roux-basic'].includes(a.foundation))
            ? 'roux-beginner'
            : a.foundation === 'cfop-two-look' && a.goal === 'advanced'
              ? 'cfop-advanced'
              : 'cfop-beginner';
  const why =
    method === 'roux-advanced'
      ? 'You can complete both blocks and basic LSE. Start by checking block choices and M/M′ control, then learn a small CMLL family; all 42 formulas are not a prerequisite.'
      : method === 'roux-beginner'
        ? 'Your interest in blocks is a good reason to try Roux. Begin with the fixed hold, M/M′ and two small blocks before adding the corner and last-six-edge steps.'
        : a.ability === 'new'
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
    alternatives:
      method === 'lbl'
        ? ['roux-beginner']
        : method.startsWith('cfop')
          ? ['roux-beginner']
          : ['cfop-beginner'],
    firstLessonHref: methodRoute(method, 'learn'),
    reasons: [why, setting],
    nextStep:
      a.duration === 'short'
        ? 'Practice one lesson segment or one small formula group. Stop at a clear checkpoint.'
        : 'Learn one segment, then add a second review or practice segment before moving on.',
  };
}
