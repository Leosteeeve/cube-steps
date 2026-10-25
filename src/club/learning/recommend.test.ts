import { expect, it } from 'vitest';
import { recommendRoute } from './recommend';
import { parseRoute } from '../../app/routes';
import { parseClubRoute } from '../routes';
import type { QuizAnswers } from './types';

it.each([
  ['new', 'none', 'few', 'explore', 'advanced', 'lbl'],
  ['new', 'roux-basic', 'enjoy', 'guided', 'advanced', 'lbl'],
  ['beginner', 'independent', 'few', 'explore', 'smooth', 'roux-beginner'],
  ['beginner', 'independent', 'enjoy', 'guided', 'advanced', 'cfop-beginner'],
  ['beginner', 'independent', 'enjoy', 'explore', 'smooth', 'cfop-beginner'],
  ['beginner', 'independent', 'few', 'guided', 'smooth', 'cfop-beginner'],
  ['beginner', 'roux-blocks', 'few', 'explore', 'advanced', 'roux-beginner'],
  ['beginner', 'roux-basic', 'few', 'explore', 'advanced', 'roux-advanced'],
  ['beginner', 'roux-basic', 'unsure', 'both', 'advanced', 'roux-advanced'],
  ['beginner', 'roux-basic', 'enjoy', 'both', 'advanced', 'roux-advanced'],
  ['beginner', 'cfop-two-look', 'enjoy', 'explore', 'advanced', 'cfop-advanced'],
  ['beginner', 'none', 'enjoy', 'guided', 'advanced', 'lbl'],
] as const)(
  'uses learning preferences without inventing readiness: %s %s %s %s %s',
  (ability, foundation, memorization, understanding, goal, method) => {
    const answers: QuizAnswers = {
      ability,
      foundation,
      memorization,
      understanding,
      goal,
      duration: 'short',
      setting: 'both',
    };
    const result = recommendRoute(answers);
    expect(result.method).toBe(method);
    expect(parseClubRoute(result.firstLessonHref)).toMatchObject({ kind: 'learn', method });
  },
);
it("explains a concept-oriented novice's later Roux option without sending them to it first", () => {
  const result = recommendRoute({
    ability: 'new',
    memorization: 'few',
    understanding: 'explore',
    goal: 'first-solve',
    duration: 'short',
    setting: 'club',
  });
  expect(result.method).toBe('lbl');
  expect(result.alternatives).toContain('roux-beginner');
  expect(result.alternativeReason).toMatch(/once you can solve independently/i);
  expect(result.alternativeReason).toMatch(/fewer memorized/i);
});
it.each([
  ['new', 'none', 'blocks', 'advanced', 'lbl'],
  ['beginner', 'independent', 'blocks', 'smooth', 'roux-beginner'],
  ['beginner', 'roux-blocks', 'blocks', 'advanced', 'roux-beginner'],
  ['beginner', 'roux-basic', 'blocks', 'advanced', 'roux-advanced'],
  ['beginner', 'roux-basic', 'unsure', 'advanced', 'roux-advanced'],
  ['two-look', 'cfop-two-look', 'layers', 'advanced', 'cfop-advanced'],
  ['beginner', 'independent', 'layers', 'smooth', 'cfop-beginner'],
  ['two-look', 'none', 'layers', 'advanced', 'lbl'],
  ['new', 'roux-basic', 'blocks', 'advanced', 'lbl'],
] as const)(
  'respects explicit prerequisites and interest: %s %s %s %s',
  (ability, foundation, preference, goal, method) => {
    const r = recommendRoute({
      ability,
      foundation,
      preference,
      goal,
      duration: 'short',
      setting: 'both',
    });
    expect(r.method).toBe(method);
    expect(r.alternatives).not.toContain(method);
    expect(parseClubRoute(r.firstLessonHref)).toMatchObject({ kind: 'learn', method });
    if (method === 'lbl' || method === 'cfop-beginner')
      expect(r.alternatives).toContain('roux-beginner');
  },
);
it('recommends only available introductory routes across all 72 answer sets', () => {
  for (const ability of ['new', 'beginner', 'f2l', 'two-look'] as const)
    for (const goal of ['first-solve', 'smooth', 'advanced'] as const)
      for (const duration of ['short', 'long'] as const)
        for (const setting of ['club', 'home', 'both'] as const) {
          const r = recommendRoute({ ability, goal, duration, setting });
          const method =
            ability === 'new'
              ? 'lbl'
              : ability === 'two-look' && goal === 'advanced'
                ? 'cfop-advanced'
                : 'cfop-beginner';
          expect(r.method).toBe(method);
          expect(parseRoute(r.firstLessonHref)).toEqual({
            kind: 'learn',
            method,
            lessonId: method === 'lbl' ? 'notation' : 'intro',
          });
          expect(r.nextStep).toContain(duration === 'short' ? 'one' : 'review');
          expect(r.reasons.join(' ')).toContain(
            setting === 'club' ? 'club' : setting === 'home' ? 'home' : 'together',
          );
        }
});
