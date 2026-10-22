import type { MethodId } from '../../core/types';
export interface QuizAnswers {
  ability: 'new' | 'beginner' | 'f2l' | 'two-look';
  goal: 'first-solve' | 'smooth' | 'advanced';
  duration: 'short' | 'long';
  setting: 'club' | 'home' | 'both';
}
export interface ClubProgress {
  version: 1;
  selectedMethod: MethodId;
  lastLesson?: { method: MethodId; lessonId: string };
  practiced: Partial<Record<MethodId, string[]>>;
}
export const CLUB_METHODS: readonly MethodId[] = ['lbl', 'cfop-beginner', 'cfop-advanced'];
