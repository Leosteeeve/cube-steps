import { useEffect, useRef, useState } from 'react';
import { getMethodInfo as getMethod } from '../../methods/info';
import { methodRoute } from '../../app/routes';
import type { MethodId } from '../../core/types';
import { CLUB_METHODS, type QuizAnswers } from './types';
import { recommendRoute } from './recommend';
import { ProgressStatus, useClubProgress } from './use-club-progress';
import { useGuidanceTarget } from '../../ui/guidance';
const allQuestions: {
  key: keyof QuizAnswers;
  title: string;
  hint?: string;
  options: [string, string][];
}[] = [
  {
    key: 'ability',
    title: 'Where are you starting?',
    options: [
      ['new', 'I cannot solve independently yet'],
      ['beginner', 'I can solve the whole cube on my own'],
    ],
  },
  {
    key: 'memorization',
    title: 'How do you feel about memorizing moves?',
    hint: 'A move sequence is a short set of turns you learn and repeat. You do not need to know any yet.',
    options: [
      ['enjoy', 'I enjoy learning and remembering move sequences'],
      ['few', 'I would rather remember fewer sequences'],
      ['unsure', 'I am not sure yet'],
    ],
  },
  {
    key: 'understanding',
    title: 'How do you like to understand something new?',
    hint: 'Enjoying explanations and enjoying memorization can go together. There is no better answer.',
    options: [
      ['explore', 'I like figuring out why moves work and trying my own ideas'],
      ['guided', 'I prefer clear steps to follow, with explanations along the way'],
      ['both', 'A mix of both, or I am still finding out'],
    ],
  },
  {
    key: 'foundation',
    title: 'What can you already do without help?',
    hint: 'This checks experience, not learning style. If these descriptions are unfamiliar, choose the first answer.',
    options: [
      ['independent', 'None of these yet, or I am not sure'],
      [
        'cfop-two-look',
        'I solve the first two layers as corner-and-edge pairs, then finish the top in four stages',
      ],
      [
        'roux-blocks',
        'I build a small block on each side, but still need help finishing the cube that way',
      ],
      [
        'roux-basic',
        'I build both side blocks, solve the top corners, then finish the last six edges using the top and middle layers',
      ],
    ],
  },
  {
    key: 'goal',
    title: 'What would you like to work toward?',
    options: [
      ['first-solve', 'My first independent solve'],
      ['smooth', 'Understand and execute more smoothly'],
      ['advanced', 'Explore more techniques and use fewer moves'],
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
  const questions = allQuestions.filter(
    (question) => question.key !== 'foundation' || answers.ability === 'beginner',
  );
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
                      ? 'Build a bottom cross, solve matching corner-and-edge pairs, then finish the top in small steps.'
                      : id === 'roux-beginner'
                        ? 'Build two blocks, solve the corners, then finish with the middle slice. Fixed white-bottom, blue-left hold. Preview.'
                        : id === 'roux-advanced'
                          ? 'Build on basic Roux with flexible blocks, more corner sequences and connected final-edge steps. Preview.'
                          : 'Build on paired solving with a shortest cross and a wider library of top-layer sequences. Preview.'}
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
              <p>{recommendation.alternativeReason}</p>
              {recommendation.alternatives.map((id) => (
                <p key={id}>
                  <a href={methodRoute(id, 'learn')} onClick={() => chooseMethod(id)}>
                    {label(id)}
                  </a>
                  {id === 'roux-beginner'
                    ? ' — start with holding the cube and turning its middle layer.'
                    : ''}
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
          {q.hint && <p id="quiz-question-hint">{q.hint}</p>}
          <fieldset aria-describedby={q.hint ? 'quiz-question-hint' : undefined}>
            <legend className="sr-only">{q.title}</legend>
            {q.options.map(([value, text]) => (
              <label className="club-answer" key={value}>
                <input
                  type="radio"
                  name={q.key}
                  value={value}
                  checked={answers[q.key] === value}
                  onChange={() =>
                    setAnswers((a) => ({
                      ...a,
                      [q.key]: value,
                      ...(q.key === 'ability' ? { foundation: undefined } : {}),
                    }))
                  }
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
