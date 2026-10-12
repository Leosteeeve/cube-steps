import { describe, expect, it } from 'vitest';
import { parseScramble } from './notation';
describe('six-face input', () => {
  it('normalizes primes without losing original error positions', () => {
    expect(parseScramble('R U’ F2')).toEqual({ok: true, moves: ['R', "U'", 'F2']});
    expect(parseScramble("RUR'U'")).toEqual({ok: true, moves: ['R','U',"R'","U'"]});
    expect(parseScramble('R M')).toMatchObject({ok:false,offset:2});
    expect(parseScramble('U’ Q')).toMatchObject({ok:false,offset:3});
  });
  it('accepts a solved input and rejects unsupported syntax', () => {
    expect(parseScramble('')).toEqual({ok:true,moves:[]});
    for (const input of ['r', 'Rw', 'x', '(R U)', 'R22', "F2'", 'R // comment']) expect(parseScramble(input).ok).toBe(false);
  });
});
