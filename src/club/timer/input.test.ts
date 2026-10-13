// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { isTimerKeyTarget } from './input';
afterEach(() => {
  document.body.innerHTML = '';
});
it.each(['input', 'textarea', 'select', 'button', 'a', 'summary', 'label'])(
  'excludes %s and descendants',
  (tag) => {
    const el = document.createElement(tag),
      child = document.createElement('span');
    el.append(child);
    document.body.append(el);
    expect(isTimerKeyTarget(el)).toBe(false);
    expect(isTimerKeyTarget(child)).toBe(false);
  },
);
it('excludes editable regions and open dialogs while allowing an ordinary page', () => {
  expect(isTimerKeyTarget(document.body)).toBe(true);
  expect(isTimerKeyTarget(null)).toBe(false);
  document.body.innerHTML = '<div contenteditable=""><span>Text</span></div>';
  expect(isTimerKeyTarget(document.querySelector('span'))).toBe(false);
  document.body.innerHTML = '<dialog open><p>Hello</p></dialog>';
  expect(isTimerKeyTarget(document.body)).toBe(false);
  expect(isTimerKeyTarget(document.querySelector('p'))).toBe(false);
  document.body.innerHTML = '<button data-timer-surface>Timer</button>';
  expect(isTimerKeyTarget(document.querySelector('button'))).toBe(false);
});
