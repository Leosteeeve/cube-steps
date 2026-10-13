// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ScrambleNet } from './ScrambleNet';
import type { FaceletSnapshot } from '../../core/types';
it('labels all six faces and preserves sticker colors in the outside-view grid', () => {
  const faces = {
    U: Array(9).fill('white'),
    D: Array(9).fill('yellow'),
    L: Array(9).fill('orange'),
    R: Array(9).fill('red'),
    F: Array(9).fill('green'),
    B: Array(9).fill('blue'),
  } as FaceletSnapshot;
  const { container } = render(<ScrambleNet facelets={faces} label="Current scramble diagram" />);
  expect(screen.getByRole('img', { name: 'Current scramble diagram' })).toBeTruthy();
  expect(container.querySelectorAll('[data-color]')).toHaveLength(54);
  expect(container.querySelectorAll('[data-face="U"] [data-color="white"]')).toHaveLength(9);
  expect(screen.getByText(/White on top/)).toBeTruthy();
});
