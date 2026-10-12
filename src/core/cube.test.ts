import { beforeAll, describe, expect, it } from 'vitest';
import { createCubeEngine } from './cube';
import type { CubeEngine, TeachingMove } from './types';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
describe('immutable cube state adapter', () => {
  it('applies face and whole-cube turns with their inverses', () => {
    const solved = engine.solved();
    for (const face of ['U','D','L','R','F','B','x','y','z']) {
      expect(engine.equals(engine.apply(solved,[face, `${face}'`] as TeachingMove[]),solved)).toBe(true);
      expect(engine.equals(engine.apply(solved,Array(4).fill(face)),solved)).toBe(true);
    }
    const snapshot = JSON.stringify(solved);
    engine.apply(solved,['R']);
    expect(JSON.stringify(solved)).toBe(snapshot);
  });
  it('distinguishes pose while recognizing a solved rotated cube', () => {
    const rotated = engine.apply(engine.solved(),['z2']);
    expect(engine.isSolved(rotated)).toBe(true);
    expect(engine.equals(rotated,engine.solved())).toBe(false);
    expect(engine.isSolved(engine.apply(rotated,['R']))).toBe(false);
  });
  it('labels centers and stickers in the actual holding frame', () => {
    const initial = engine.observe(engine.solved());
    expect(initial.centers).toEqual({U:'white',D:'yellow',F:'green',B:'blue',R:'red',L:'orange'});
    expect(initial.edges.find(p=>p.slot==='UF')?.stickers).toEqual({U:'white',F:'green'});
    expect(engine.observe(engine.apply(engine.solved(),['z2'])).centers.U).toBe('yellow');
    expect(engine.observe(engine.apply(engine.solved(),['y'])).centers.F).toBe('red');
  });
});
