// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { FaceletSnapshot } from '../core/types';
import { CubeNet } from './CubeNet';
afterEach(cleanup);
const facelets: FaceletSnapshot = {
  U: Array(9).fill('white'),
  D: Array(9).fill('yellow'),
  F: Array(9).fill('green'),
  B: Array(9).fill('blue'),
  R: Array(9).fill('red'),
  L: Array(9).fill('orange'),
};
it('renders 54 actual colors and gives targets a visible non-color marker', () => {
  const view = render(
    <CubeNet
      facelets={facelets}
      targets={[
        { face: 'U', index: 7 },
        { face: 'F', index: 1 },
      ]}
      holdingLabel="White up, green front"
    />,
  );
  expect(screen.getByRole('img', { name: /Six-face view.*White up, green front/ })).toBeVisible();
  expect(view.container.querySelectorAll('[data-facelet]')).toHaveLength(54);
  expect(view.container.querySelectorAll('[data-target="true"]')).toHaveLength(2);
  expect(view.container.querySelector('[data-facelet="U8"] title')).toHaveTextContent(
    'U8: white · target piece',
  );
  expect(view.container.querySelector('[data-facelet="F2"] title')).toHaveTextContent(
    'F2: green · target piece',
  );
  expect(view.container.querySelectorAll('.cube-net-target-mark')).toHaveLength(2);
  view.rerender(
    <CubeNet
      facelets={{ ...facelets, F: ['red', ...facelets.F.slice(1)] }}
      targets={[]}
      holdingLabel="Updated hold"
    />,
  );
  expect(view.container.querySelector('[data-facelet="F1"] title')).toHaveTextContent('F1: red');
  expect(view.container.querySelectorAll('[data-target="true"]')).toHaveLength(0);
});
