import type { MethodId } from '../../core/types';
export interface QuizAnswers {
  memorization?: 'enjoy' | 'few' | 'unsure';
  understanding?: 'explore' | 'guided' | 'both';
  preference?: 'layers' | 'blocks' | 'unsure';
  foundation?: 'none' | 'independent' | 'cfop-two-look' | 'roux-blocks' | 'roux-basic';
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
export const CLUB_METHODS: readonly MethodId[] = [
  'lbl',
  'cfop-beginner',
  'cfop-advanced',
  'roux-beginner',
  'roux-advanced',
];
