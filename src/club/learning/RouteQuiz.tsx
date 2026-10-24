import { useEffect, useRef, useState } from 'react';
import { getMethodInfo as getMethod } from '../../methods/info';
import { methodRoute } from '../../app/routes';
import type { MethodId } from '../../core/types';
import { CLUB_METHODS, type QuizAnswers } from './types';
import { recommendRoute } from './recommend';
import { ProgressStatus, useClubProgress } from './use-club-progress';
import { useGuidanceTarget } from '../../ui/guidance';
const questions: { key: keyof QuizAnswers; title: string; options: [string, string][] }[] = [
  {
    key: 'ability',
    title: 'Where are you starting?',
    options: [
      ['new', 'I cannot solve independently yet'],
      ['beginner', 'I can solve with a beginner method'],
      ['f2l', 'I can pair F2L, but I am still learning last-layer basics'],
      ['two-look', 'I am comfortable with F2L and two-look OLL / PLL'],
    ],
  },
  {
    key: 'preference',
    title: 'Which way of thinking would you like to explore?',
    options: [
      ['layers', 'Build layers and pair pieces'],
      ['blocks', 'Build small blocks and use the middle slice'],
      ['unsure', 'I am not sure yet'],
    ],
  },
  {
    key: 'foundation',
    title: 'Which foundation can you use on your own?',
    options: [
      ['none', 'I still need help completing a solve'],
      ['independent', 'I can solve, but these method skills are new to me'],
      ['cfop-two-look', 'CFOP: F2L and two-look last layer'],
      ['roux-blocks', 'Roux: both blocks; still learning corners or LSE'],
      ['roux-basic', 'Roux: both blocks, corners and basic LSE'],
    ],
  },
  {
    key: 'goal',
    title: 'What would you like to work toward?',
    options: [
      ['first-solve', 'My first independent solve'],
      ['smooth', 'Understand and execute more smoothly'],
      ['advanced', 'Learn advanced formulas and reduce steps'],
    ],
  },
  {
    key: 'duration',
    title: 'How do you usually practice?',
    options: [
      ['short', 'Short sessions'],
      ['long', 'Longer sessions'],
    ],
  },
  {
    key: 'setting',
    title: 'Where will you practice?',
    options: [
      ['club', 'At the club'],
      ['home', 'At home'],
      ['both', 'Both'],
    ],
  },
];
const label = (method: MethodId) =>
  getMethod(method).label + (getMethod(method).teachingStatus === 'preview' ? ' · Preview' : '');
export function RouteQuiz() {
  const answersTarget = useGuidanceTarget('quiz.answers'),
    routeTarget = useGuidanceTarget('quiz.route');
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({}),
    [step, setStep] = useState(0),
    [chooser, setChooser] = useState(false),
    [override, setOverride] = useState<MethodId>();
  const { chooseMethod } = useClubProgress(),
    title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, [step, chooser]);
  const recommendation = step === questions.length ? recommendRoute(answers as QuizAnswers) : null;
  const method = override ?? recommendation?.method;
  const q = questions[step];
  return (
    <section ref={answersTarget} className="club-quiz club-panel">
      <p ref={routeTarget} className="club-kicker">
        YOUR CUBE. YOUR STARTING POINT.
      </p>
      <h1 ref={title} tabIndex={-1}>
        {chooser ? 'Choose your starting point' : method ? 'A route to grow with.' : q.title}
      </h1>
      {chooser ? (
        <>
          <p>You can change routes or repeat a lesson at any time.</p>
          <div className="club-route-choices">
            {CLUB_METHODS.map((id) => (
              <button
                key={id}
                aria-labelledby={'choose-' + id}
                aria-describedby={'describe-' + id}
                onClick={() => {
                  chooseMethod(id);
                  setOverride(id);
                  setChooser(false);
                }}
              >
                <strong id={'choose-' + id}>Choose {label(id)}</strong>
                <span id={'describe-' + id}>
                  {id === 'lbl'
                    ? 'Start with notation, holding, and the white daisy.'
                    : id === 'cfop-beginner'
                      ? 'Build a bottom cross, pair F2L, and learn two-look last-layer steps.'
                      : id === 'roux-beginner'
                        ? 'Build two blocks, solve the corners, then finish with the middle slice. Fixed white-bottom, blue-left hold. Preview.'
                        : id === 'roux-advanced'
                          ? 'Explore flexible blocks, full CMLL and connected LSE. Keep a comfortable starting hold. Preview.'
                          : 'Explore shortest cross, full F2L, OLL and PLL formulas.'}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : method ? (
        <>
          <p className="club-result-label">{label(method)}</p>
          {!override && recommendation ? (
            <>
              <ul>
                {recommendation.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <h2>Your next small step</h2>
              <p>{recommendation.nextStep}</p>
              <p>
                This suggests a starting point, not an aptitude score or a promise of faster solves.
              </p>
              <h2>Another route to explore</h2>
              {recommendation.alternatives.map((id) => (
                <p key={id}>
                  <a href={methodRoute(id, 'learn')} onClick={() => chooseMethod(id)}>
                    {label(id)}
                  </a>
                  {id === 'roux-beginner' ? ' — start with notation, the fixed hold and M/M′.' : ''}
                </p>
              ))}
            </>
          ) : (
            <p>You chose this route. Start at the introduction, and switch whenever you need.</p>
          )}
          <div className="club-actions">
            <a
              className="club-primary"
              href={methodRoute(method, 'learn')}
              onClick={() => chooseMethod(method)}
            >
              Start lesson
            </a>
            <button onClick={() => setChooser(true)}>Change route</button>
          </div>
        </>
      ) : (
        <>
          <p>
            Question {step + 1} of {questions.length} · Your answers stay in this page.
          </p>
          <fieldset>
            <legend className="sr-only">{q.title}</legend>
            {q.options.map(([value, text]) => (
              <label className="club-answer" key={value}>
                <input
                  type="radio"
                  name={q.key}
                  value={value}
                  checked={answers[q.key] === value}
                  onChange={() => setAnswers((a) => ({ ...a, [q.key]: value }))}
                />
                <span>{text}</span>
              </label>
            ))}
          </fieldset>
          <div className="club-quiz-controls">
            {step > 0 && <button onClick={() => setStep((n) => n - 1)}>Back</button>}
            <button
              className="club-primary"
              disabled={!answers[q.key]}
              onClick={() => setStep((n) => n + 1)}
            >
              {step === questions.length - 1 ? 'Show my route' : 'Next'}
            </button>
            <button className="club-text-button" onClick={() => setChooser(true)}>
              Skip questions
            </button>
          </div>
        </>
      )}
      <ProgressStatus />
    </section>
  );
}
