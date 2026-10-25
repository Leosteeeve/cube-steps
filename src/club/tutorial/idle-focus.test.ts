// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createTutorialRuntime } from './runtime';
afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});
it('remembering an early interaction never restores focus from a tour that did not open', () => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = '<main tabindex="-1"></main><button>Close image</button>';
  const runtime = createTutorialRuntime(() => localStorage);
  const button = document.querySelector('button')!;
  runtime.interact();
  button.focus();
  vi.runAllTimers();
  expect(document.activeElement).toBe(button);
  runtime.dispose();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

it.each(['welcome', 'tour'] as const)(
  'closing the %s does not steal focus from a newly selected answer',
  (kind) => {
    vi.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '<main><h1 tabindex="-1">Question</h1><input type="radio"></main>';
    const runtime = createTutorialRuntime(() => localStorage);
    const heading = document.querySelector('h1')!;
    const answer = document.querySelector('input')!;
    heading.focus();
    runtime.setRoute('home', 'home');
    runtime.registerEntry('home', true);
    runtime.bridge.registerTarget('home.start', answer, true);
    runtime.offer();
    expect(runtime.snapshot().welcome).toBe('home');
    if (kind === 'tour') {
      runtime.requestStart('home', 'start');
      runtime.exit();
    } else runtime.welcomeChoice('never');

    // A user can focus a control before deferred overlay cleanup completes.
    answer.focus();
    vi.runAllTimers();
    expect(document.activeElement).toBe(answer);
    runtime.dispose();
  },
);
