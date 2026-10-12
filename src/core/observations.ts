import type { Color, CubeObservation, CubeState, Face, PieceObservation } from './types';
// Reid ordering used by the cubing.js 3x3 definition. Each name also gives
// the cyclic sticker order; orientation advances through that cycle.
export const EDGE_SLOTS = 'UF UR UB UL DF DR DB DL FR FL BR BL'.split(' ');
export const CORNER_SLOTS = 'UFR URB UBL ULF DRF DFL DLB DBR'.split(' ');
export const CENTER_SLOTS: Face[] = ['U','L','F','R','B','D'];
export const COLORS: Record<Face,Color> = {U:'white',D:'yellow',F:'green',B:'blue',R:'red',L:'orange'};
export function observeState(state: CubeState): CubeObservation {
  function pieces(orbit: string, slots: string[]): PieceObservation[] {
    const data = state.data[orbit];
    return slots.map((slot,index) => {
      const original = slots[data.pieces[index]];
      const stickers: Partial<Record<Face,Color>> = {};
      [...slot].forEach((face,i) => { stickers[face as Face] = COLORS[original[(i+data.orientation[index])%slot.length] as Face]; });
      return {id:original,slot,stickers};
    });
  }
  const centers = Object.fromEntries(CENTER_SLOTS.map((face,i)=>[face,COLORS[CENTER_SLOTS[state.data.CENTERS.pieces[i]]]])) as Record<Face,Color>;
  return {centers,edges:pieces('EDGES',EDGE_SLOTS),corners:pieces('CORNERS',CORNER_SLOTS)};
}
