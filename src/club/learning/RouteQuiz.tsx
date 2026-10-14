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
  const recommendation = step === 4 ? recommendRoute(answers as QuizAnswers) : null;
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
          <p>Question {step + 1} of 4 · Your answers stay in this page.</p>
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
              {step === 3 ? 'Show my route' : 'Next'}
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
