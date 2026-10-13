import { it, expect } from 'vitest';
import { copyCubeState } from './state';
it('copies every orbit array and freezes the snapshot without freezing its input', () => {
  const data = { TEST: { pieces: [1, 0], orientation: [0, 1], orientationMod: [1, 2] } };
  const state = copyCubeState(data);
  data.TEST.pieces[0] = 0;
  data.TEST.orientation[0] = 1;
  data.TEST.orientationMod[0] = 2;
  expect(state.data.TEST).toEqual({ pieces: [1, 0], orientation: [0, 1], orientationMod: [1, 2] });
  expect(() => {
    state.data.TEST.pieces[0] = 9;
  }).toThrow();
  expect(() => {
    state.data.TEST.orientation[0] = 9;
  }).toThrow();
  expect(() => {
    state.data.TEST.orientationMod![0] = 9;
  }).toThrow();
  expect(
    Object.isFrozen(state.data.TEST) && Object.isFrozen(state.data) && Object.isFrozen(state),
  ).toBe(true);
});
