import type { Color } from '../core/types';
// Display colors only: logical cube colors, notation and state remain unchanged.
export const CUBE_COLORS: Readonly<Record<Color, string>> = Object.freeze({
  white: '#ffffff',
  yellow: '#ffe34d',
  red: '#ff625b',
  orange: '#ffad3d',
  blue: '#4d94ff',
  green: '#35d58a',
});
