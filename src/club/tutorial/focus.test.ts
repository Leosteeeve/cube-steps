// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { collectTourFocusables } from './focus';
it('includes only enabled visible controls and the allowed target', () => {
  document.body.innerHTML =
    '<div id="bubble"><button>A</button><button disabled>B</button><button hidden>C</button></div><button id="target">Play</button>';
  const b = document.getElementById('bubble')!,
    t = document.getElementById('target')!;
  expect(collectTourFocusables(b, t, false).map((x) => x.textContent)).toEqual(['A']);
  expect(collectTourFocusables(b, t, true).map((x) => x.textContent)).toEqual(['A', 'Play']);
});
