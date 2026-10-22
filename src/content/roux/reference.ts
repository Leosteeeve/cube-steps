import type { CubeEngine, TeachingMove } from '../../core/types';
import { ROUX_CORNER_ALGORITHMS } from '../../methods/roux/corners/catalog';
import { ROUX_LSE_ALGORITHMS } from '../../methods/roux/lse/catalog';
import { rouxReferenceState } from '../../methods/roux/frame';
const inverse=(moves:readonly TeachingMove[])=>[...moves].reverse().map(m=>m.endsWith('2')?m:m.endsWith("'")?m.slice(0,-1):m+"'") as TeachingMove[];
export const ROUX_REFERENCE = Object.entries({...ROUX_CORNER_ALGORITHMS,...ROUX_LSE_ALGORITHMS}).map(([id,algorithm])=>({
  id,algorithm,exampleState:(engine:CubeEngine)=>engine.apply(rouxReferenceState(engine),inverse(algorithm.moves)),
}));
