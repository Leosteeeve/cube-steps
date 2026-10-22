import type { CubeEngine, CubeState, Face, FaceletRef, FaceletSnapshot } from '../../core/types';
import { stateToFacelets } from '../../core/facelets';
import { FACELET_LAYOUT } from '../../core/facelet-layout';
import { CORNER_SLOTS, EDGE_SLOTS } from '../../core/observations';
export interface RouxDiagramModel {
  facelets: FaceletSnapshot; visible: readonly FaceletRef[]; targets: readonly string[]; caption: string;
}
export function buildRouxDiagram(engine: CubeEngine, state: CubeState, targets: readonly string[], mode: 'block'|'corners'|'lse'): RouxDiagramModel {
  const observation=engine.observe(state), visible:FaceletRef[]=[];
  for(const face of ['U','L','F','R','B','D'] as Face[]) FACELET_LAYOUT[face].forEach((p,index)=>{
    const slot=(p.orbit==='CORNERS'?CORNER_SLOTS:p.orbit==='EDGES'?EDGE_SLOTS:[])[p.slot];
    const piece=[...observation.edges,...observation.corners].find(x=>x.slot===slot);
    if(mode==='corners' ? p.orbit==='CORNERS' && slot.includes('U') : mode==='lse' ? p.orbit==='CENTERS'||p.orbit==='EDGES'&&['UF','UR','UB','UL','DF','DB'].includes(slot) : p.orbit==='CENTERS'||!!piece&&targets.includes(piece.id)) visible.push({face,index});
  });
  return {facelets:stateToFacelets(state),visible,targets,caption:mode==='corners'?'Only the four top corners matter. Gray stickers are ignored.':mode==='lse'?'Six remaining edges and the current centers. Read the fixed side frame.':'Outlined target pieces; gray stickers are outside this goal.'};
}
