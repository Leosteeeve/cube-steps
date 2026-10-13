import { expect, it } from 'vitest';
import { recommendRoute } from './recommend';
import { parseRoute } from '../../app/routes';
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
