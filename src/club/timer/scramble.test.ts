import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { stateToFacelets, validateFacelets } from '../../core/facelets';
import { prepareTimerScramble } from './scramble';
it('prepares one immutable state and matching net from the exact displayed moves', async () => {
  const engine = await createCubeEngine(),
    text = "R U R' U'",
    s = prepareTimerScramble(engine, text, 'fixed');
  const expected = engine.apply(engine.solved(), ['R', 'U', "R'", "U'"]);
  expect(s.text).toBe(text);
  expect(s.facelets).toEqual(stateToFacelets(expected));
  expect(engine.equals(s.state, expected)).toBe(true);
  const result = validateFacelets(s.facelets, engine.solved());
  expect(result.ok && engine.equals(result.state, s.state)).toBe(true);
  expect(Object.isFrozen(s)).toBe(true);
  expect(Object.isFrozen(s.facelets.U)).toBe(true);
  expect(() => prepareTimerScramble(engine, 'x R', 'bad')).toThrow();
  expect(() => prepareTimerScramble(engine, '', 'empty')).toThrow();
});
