// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { createTutorialRuntime } from './runtime';
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
