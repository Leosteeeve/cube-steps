// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { isTrialInputTarget, shouldHandleTrialKey } from './input';
it('ignores editable, control and nested interactive targets', () => {
  for (const html of [
    '<input>',
    '<textarea></textarea>',
    '<select></select>',
    '<button><span>x</span></button>',
    '<a href="#">x</a>',
    '<div contenteditable="true"><span>x</span></div>',
    '<summary>x</summary>',
    '<div role="slider"></div>',
  ]) {
    document.body.innerHTML = html;
    const node = document.querySelector('span') ?? document.body.firstElementChild;
    expect(isTrialInputTarget(node)).toBe(true);
  }
  expect(isTrialInputTarget(document.body)).toBe(false);
});
it('accepts only an unlocked, unmodified, non-repeat Space key', () => {
  document.body.replaceChildren();
  const base = {
    code: 'Space',
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    target: document.body,
  };
  expect(shouldHandleTrialKey(base, false)).toBe(true);
  for (const patch of [
    { repeat: true },
    { code: 'Enter' },
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
    { shiftKey: true },
  ])
    expect(shouldHandleTrialKey({ ...base, ...patch }, false)).toBe(false);
  expect(shouldHandleTrialKey(base, true)).toBe(false);
});
