import type { CubeEngine, CubeState, TeachingMove } from '../../core/types';
import { pieceSolved } from '../shared/pieces';
export const CROSS_CASES: Readonly<Record<string, { moves: TeachingMove[]; explanation: string }>> = {
  'extract-DF': { moves: ['F2'], explanation: 'Lift this misplaced bottom edge to the top with a half turn. The other bottom cross edges stay in place.' },
  'extract-DR': { moves: ['R2'], explanation: 'Lift this misplaced right-bottom edge to the top; the other bottom cross edges stay in place.' },
  'extract-DB': { moves: ['B2'], explanation: 'Lift this misplaced back-bottom edge to the top; the other bottom cross edges stay in place.' },
  'extract-DL': { moves: ['L2'], explanation: 'Lift this misplaced left-bottom edge to the top; the other bottom cross edges stay in place.' },
  'extract-FR': { moves: ['R', 'U', "R'"], explanation: 'Open the right face, move the edge onto the top, then close the right face to restore its cross edge.' },
  'extract-FL': { moves: ["L'", "U'", 'L'], explanation: 'Open the left face, move the edge onto the top, then close the left face to restore its cross edge.' },
  'extract-BR': { moves: ["R'", 'U', 'R'], explanation: 'Open the back-right slot, move its edge to the top, then restore the right cross edge.' },
  'extract-BL': { moves: ['L', "U'", "L'"], explanation: 'Open the back-left slot, move its edge to the top, then restore the left cross edge.' },
  'flip-top': { moves: ["F'", "U'", "L'", 'U', 'L', 'F'], explanation: 'Move the front-facing white sticker onto the top through the front-left opening, then close both faces. The bottom cross is restored at this checkpoint.' },
  'insert': { moves: ['F2'], explanation: 'The side sticker matches the front center. Turn the front face halfway to place white on the bottom and match both centers.' },
};
export interface CrossMatch { caseId: string; moves: TeachingMove[]; kind: 'setup' | 'regrip'; recognition: string; explanation: string }
export function recognizeCross(engine: CubeEngine, state: CubeState, target: string): CrossMatch | null {
  const o = engine.observe(state), edge = o.edges.find(p => p.id === target);
  if (!edge || o.centers.D !== 'white' || !Object.values(edge.stickers).includes('white') || pieceSolved(edge, o)) return null;
  const color = Object.values(edge.stickers).find(c => c !== 'white')!;
  const home = ['F', 'R', 'B', 'L'].findIndex(f => o.centers[f as 'F'] === color);
  const recognition = `The white-${color} edge is at ${edge.slot}; white faces ${Object.entries(edge.stickers).find(([, c]) => c === 'white')![0]}.`;
  if (home !== 0) return { caseId: 'cross-home-front', moves: [[ 'y' ], [ 'y2' ], [ "y'" ]][home - 1] as TeachingMove[], kind: 'regrip', recognition, explanation: `Rotate the whole cube to put the ${color} center in front, keeping white down. This edge belongs below that center.` };
  const extraction = CROSS_CASES[`extract-${edge.slot}`];
  if (extraction) return { caseId: `cross-extract-${edge.slot}`, ...extraction, kind: 'setup', recognition };
  if (edge.slot !== 'UF') {
    const moves: Record<string, TeachingMove[]> = { UR: ['U'], UB: ['U2'], UL: ["U'"] };
    return { caseId: 'cross-align-top', moves: moves[edge.slot], kind: 'setup', recognition, explanation: 'Turn only the top layer to bring this edge above its matching front center.' };
  }
  const id = edge.stickers.U === 'white' ? 'insert' : 'flip-top';
  return { caseId: `cross-${id}`, ...CROSS_CASES[id], kind: 'setup', recognition };
}
export function preservesCrossEdges(engine: CubeEngine, before: CubeState, after: CubeState): boolean {
  const a = engine.observe(before), b = engine.observe(after);
  return a.edges.filter(p => Object.values(p.stickers).includes('white') && pieceSolved(p, a)).every(p => pieceSolved(b.edges.find(q => q.id === p.id)!, b));
}
