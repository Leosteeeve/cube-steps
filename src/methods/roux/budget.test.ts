import { expect, it } from 'vitest';
import { createRouxBudget } from './budget';
it('stops node expansion at the configured boundary and keeps budgets isolated', () => {
  const b = createRouxBudget({ maxNodes: 1 });
  b.node('roux-first-block');
  expect(() => b.node('roux-first-block')).toThrow(/budget/i);
  expect(() => createRouxBudget({ maxNodes: 1 }).node('roux-first-block')).not.toThrow();
});
it('stops work at 15000 milliseconds, not only after another large search', () => {
  let time = 100;
  const b = createRouxBudget(undefined, () => time);
  time = 15099;
  expect(() => b.node('roux-second-block')).not.toThrow();
  time = 15100;
  expect(() => b.node('roux-second-block')).toThrow(/time/i);
});
it('accepts 160 emitted actions and rejects the next', () => {
  const b = createRouxBudget();
  for (let n = 0; n < 160; n++) b.action('roux-first-block', ['U']);
  expect(() => b.action('roux-first-block', ['U'])).toThrow(/action/i);
});
it('accepts 400 tokens and rejects the next without charging candidates as emitted actions', () => {
  const b = createRouxBudget();
  b.action('roux-last-four-edges', Array(400).fill('M'));
  expect(() => b.action('roux-last-four-edges', ['U'])).toThrow(/move/i);
});
it('rejects invalid limits instead of disabling safety', () => {
  for (const maxNodes of [-1, NaN, Infinity, 0.5])
    expect(() => createRouxBudget({ maxNodes })).toThrow(/limit/i);
});
