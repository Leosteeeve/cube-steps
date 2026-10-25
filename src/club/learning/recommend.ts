import type { MethodId } from '../../core/types';
import { methodRoute } from '../../app/routes';
import type { QuizAnswers } from './types';
export function recommendRoute(a: QuizAnswers): {
  method: MethodId;
  firstLessonHref: string;
  reasons: string[];
  nextStep: string;
  alternatives: readonly MethodId[];
  alternativeReason: string;
} {
  const hasLearningPreferences = a.memorization !== undefined && a.understanding !== undefined;
  // Preference is not readiness: learners may enjoy both memory and understanding.
  const preference = hasLearningPreferences
    ? a.understanding === 'guided'
      ? 'layers'
      : a.memorization === 'few' || (a.memorization === 'unsure' && a.understanding === 'explore')
        ? 'blocks'
        : 'unsure'
    : a.preference;
  const foundation = a.foundation ?? (hasLearningPreferences ? 'independent' : undefined);
  const legacyMethod: MethodId =
    a.ability === 'new'
      ? 'lbl'
      : a.ability === 'two-look' && a.goal === 'advanced'
        ? 'cfop-advanced'
        : 'cfop-beginner';
  // Missing new answers preserve the old rule; they do not invent a preference.
  const method: MethodId =
    foundation === undefined || preference === undefined
      ? legacyMethod
      : a.ability === 'new' || foundation === 'none'
        ? 'lbl'
        : foundation === 'roux-basic' && a.goal === 'advanced' && preference !== 'layers'
          ? 'roux-advanced'
          : preference === 'blocks' ||
              (preference === 'unsure' && ['roux-blocks', 'roux-basic'].includes(foundation))
            ? 'roux-beginner'
            : foundation === 'cfop-two-look' && a.goal === 'advanced'
              ? 'cfop-advanced'
              : 'cfop-beginner';
  const why =
    method === 'roux-advanced'
      ? 'You already build both side blocks and finish the remaining edges. Advanced Roux builds on that experience with more flexible block choices and corner sequences. Learn a small group at a time; all 42 corner formulas are not a prerequisite.'
      : method === 'roux-beginner'
        ? 'Beginner Roux solves two small blocks of matching pieces, then the corners and remaining edges. It uses fewer memorized sequences, but asks for more understanding and exploration. Begin with holding the cube and turning its middle layer.'
        : method === 'lbl'
          ? 'LBL means layer by layer: follow a clear sequence of small goals toward your first independent solve, starting with notation and the white daisy.'
          : method === 'cfop-advanced'
            ? 'You already solve corner-and-edge pairs and finish the top in four stages. Advanced CFOP builds on those skills with more efficient choices and a larger library of top-layer sequences. Start with a small set.'
            : a.ability === 'f2l'
              ? 'Keep your corner-and-edge pairing skills and practice recognizing the final-layer steps.'
              : 'Beginner CFOP builds on your independent solves: make a bottom cross, solve matching corner-and-edge pairs, then finish the top in small steps.';
  const learningReason = hasLearningPreferences
    ? [
        a.memorization === 'few'
          ? 'You prefer fewer sequences to remember; every route still uses some.'
          : a.memorization === 'enjoy'
            ? 'You enjoy remembering move sequences; you can build that library gradually.'
            : 'You do not need to decide how much memorization suits you yet.',
        a.understanding === 'explore'
          ? 'You like understanding why moves work and exploring your own ideas.'
          : a.understanding === 'guided'
            ? 'You prefer clear instructions with explanations, so a structured starting route is a useful fit.'
            : 'You can mix guided practice with exploring why moves work.',
      ].join(' ')
    : undefined;
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
    alternativeReason:
      method === 'lbl'
        ? preference === 'blocks'
          ? a.memorization === 'few'
            ? 'Once you can solve independently, Beginner Roux may suit your preference for fewer memorized sequences and exploring how pieces move. It needs more understanding and practice, so we suggest building confidence with LBL first.'
            : 'Once you can solve independently, Beginner Roux may suit your interest in exploring how pieces move. It uses fewer memorized sequences but needs more understanding and practice, so we suggest building confidence with LBL first.'
          : 'Once you can solve independently, you can also try Beginner Roux: fewer memorized sequences, with more emphasis on understanding how pieces move.'
        : method.startsWith('cfop')
          ? 'Beginner Roux offers a different approach: fewer memorized sequences and more exploration of how pieces move. Both routes teach the reasons behind their moves.'
          : 'Beginner CFOP offers a structured progression through layers and pairs, with short move sequences you can learn gradually. Both routes teach the reasons behind their moves.',
    reasons: [why, ...(learningReason ? [learningReason] : []), setting],
    nextStep:
      a.duration === 'short'
        ? 'Practice one lesson segment or one small formula group. Stop at a clear checkpoint.'
        : 'Learn one segment, then add a second review or practice segment before moving on.',
  };
}
